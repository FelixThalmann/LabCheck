import os
import pandas as pd
import numpy as np
import lightgbm as lgb
import joblib
from sklearn.model_selection import train_test_split
from sqlalchemy import create_engine

# --- 1. Configuration and Database Connection ---

# Load the database URL from environment variables (set by Docker Compose)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set!")

# Create the SQLAlchemy Engine for communication with PostgreSQL
try:
    engine = create_engine(DATABASE_URL)
except Exception as e:
    print(f"Error creating DB engine: {e}")
    exit(1)

# Load debug flag from environment variables
DEBUG_PREDICTION = os.getenv("DEBUG_PREDICTION", "false").lower() == "true"

# --- 2. Load Data from Database ---

# Query to fetch all events from the new Event table
query = '''
SELECT 
    e."timestamp",
    e."personCount",
    e."isDoorOpen",
    e."eventType"
FROM "events" e
ORDER BY e."timestamp" ASC
'''

print("Loading data from database...")
print(f"DATABASE_URL: {DATABASE_URL}")
try:
    # Load raw event data
    df_raw = pd.read_sql(query, engine, parse_dates=['timestamp'])
except Exception as e:
    print(f"Error loading data: {e}")
    exit(1)

# Check if data was loaded
if df_raw.empty:
    print("No data found in database. Training will be skipped.")
    exit(0)

print(f"{len(df_raw)} raw events successfully loaded.")

# --- 3. Create 2-Hour Snapshots from Raw Events ---

def create_snapshots_from_events(df_events, interval_hours=2):
    """
    Creates 2-hour snapshots from scattered event data.
    
    Args:
        df_events: DataFrame with raw events
        interval_hours: Interval size in hours (default: 2)
    
    Returns:
        DataFrame with aggregated snapshots
    """
    print(f"Creating {interval_hours}-hour snapshots from {len(df_events)} events...")
    
    # Set timestamp as index for easier manipulation
    df_events = df_events.set_index('timestamp').sort_index()
    
    # Create time bins for 2-hour intervals
    # Round down to nearest interval
    df_events['time_bin'] = df_events.index.floor(f'{interval_hours}H')
    
    # Group by time bin and aggregate
    snapshots = []
    
    for time_bin, group in df_events.groupby('time_bin'):
        # Calculate aggregated values for this 2-hour period
        snapshot = {
            'timestamp': time_bin,
            'personCount': group['personCount'].mean(),  # Average occupancy
            'maxOccupancy': group['personCount'].max(),  # Peak occupancy
            'minOccupancy': group['personCount'].min(),  # Minimum occupancy
            'isDoorOpen': group['isDoorOpen'].mean() > 0.5,  # Door open >50% of time
            'doorOpenPercentage': group['isDoorOpen'].mean() * 100,  # Percentage door open
            'totalEvents': len(group),  # Number of events in this period
            'doorEvents': len(group[group['eventType'] == 'DOOR_EVENT']),
            'passageEvents': len(group[group['eventType'] == 'PASSAGE_EVENT'])
        }
        snapshots.append(snapshot)
    
    # Convert to DataFrame
    df_snapshots = pd.DataFrame(snapshots)
    df_snapshots = df_snapshots.set_index('timestamp').sort_index()
    
    print(f"Created {len(df_snapshots)} snapshots from {len(df_events)} events")
    
    if DEBUG_PREDICTION:
        print("Sample snapshots:")
        print(df_snapshots.head(10))
        print(f"Snapshot time range: {df_snapshots.index.min()} to {df_snapshots.index.max()}")
        print(f"Hours covered: {df_snapshots.index.hour.value_counts().sort_index()}")
    
    return df_snapshots

# Create 2-hour snapshots
df = create_snapshots_from_events(df_raw, interval_hours=2)

# --- 4. Feature Engineering ---

# ESSENTIAL features only - optimized for your use case
df['hour'] = df.index.hour
df['day_of_week'] = df.index.dayofweek
df['is_weekend'] = (df.index.dayofweek >= 5).astype(int)

# Business hours feature (most important for your use case)
df['is_business_hours'] = ((df.index.hour >= 8) & (df.index.hour < 18)).astype(int)

# Cyclical encoding for hour (better than linear)
df['hour_sin'] = np.sin(2 * np.pi * df.index.hour / 24)
df['hour_cos'] = np.cos(2 * np.pi * df.index.hour / 24)

# Only essential features - keep it simple
# No additional snapshot features to avoid overfitting

# --- 4.1. Data analysis ---

if DEBUG_PREDICTION:
    print("\n=== SNAPSHOT ANALYSIS ===")
    print("Snapshot data sample:")
    print(df.head(20))
    print(f"Hours distribution: {df['hour'].value_counts().sort_index()}")
    print(f"Business hours vs non-business: {df['is_business_hours'].value_counts()}")
    
    print("\nFeature correlation with occupancy:")
    correlation_features = ['personCount', 'hour', 'day_of_week', 'is_weekend', 'is_business_hours']
    correlation_matrix = df[correlation_features].corr()
    print(correlation_matrix['personCount'].sort_values(ascending=False))
    
    print(f"\nOccupancy statistics:")
    print(df['personCount'].describe())
    print(f"\nDoor status distribution:")
    print(df['isDoorOpen'].value_counts())
    
    print(f"\nFeature statistics:")
    print(df[['hour_sin', 'hour_cos', 'day_of_week', 'is_weekend', 'is_business_hours']].describe())

# --- 5. Model Training ---

print("Starting combined model training...")

# Target variable 1: Regression (occupancy)
y_occupancy = df['personCount']

# Target variable 2: Classification (door status)
# Convert Boolean (True/False) to Integer (1/0)
y_door = df['isDoorOpen'].astype(int)

# Use minimal feature set - only the most important features
X = df[['hour_sin', 'hour_cos', 'day_of_week', 'is_weekend', 'is_business_hours']]

# Split data (shuffle=False is important for time series!) (same splits for both models)
X_train, X_test, y_occ_train, y_occ_test, y_door_train, y_door_test = train_test_split(
    X, y_occupancy, y_door, test_size=0.2, shuffle=False
)

# --- Model 1: Regression for occupancy ---
print("Train Regression model for occupancy...")
lgbm_reg = lgb.LGBMRegressor(
    objective='regression_l1', 
    random_state=42,
    n_estimators=100,
    max_depth=6,
    min_child_samples=20,
    verbose=-1
)

lgbm_reg.fit(
    X_train, y_occ_train, 
    eval_set=[(X_test, y_occ_test)], 
    callbacks=[lgb.early_stopping(50, verbose=False)] # verbose=False for less log output in cronjob
)

# --- Model 2: Classification for door status ---    
print("Train Classification model for door status...")
lgbm_clf = lgb.LGBMClassifier(
    objective='binary', # objective='binary' for Yes/No
    random_state=42, 
    class_weight='balanced', # to also consider less frequent classes (door closed is less frequent than door open)
    n_estimators=100,
    max_depth=6,
    min_child_samples=20,
    verbose=-1
)

lgbm_clf.fit(
    X_train, y_door_train, 
    eval_set=[(X_test, y_door_test)], 
    callbacks=[lgb.early_stopping(50, verbose=False)] # verbose=False for less log output in cronjob
)

# --- 5.1. Feature importance analysis ---

if DEBUG_PREDICTION:
    print("\n=== FEATURE IMPORTANCE ===")
    feature_names = ['hour_sin', 'hour_cos', 'day_of_week', 'is_weekend', 'is_business_hours']
    
    print("Occupancy Model:")
    importance_reg = lgbm_reg.feature_importances_
    for name, importance in zip(feature_names, importance_reg):
        print(f"{name}: {importance:.4f}")
    
    print("\nDoor Model:")
    importance_clf = lgbm_clf.feature_importances_
    for name, importance in zip(feature_names, importance_clf):
        print(f"{name}: {importance:.4f}")

# --- 5.2. Model evaluation ---

if DEBUG_PREDICTION:
    print("\n=== MODEL EVALUATION ===")
    # Predictions on test set
    preds_reg = lgbm_reg.predict(X_test)
    preds_clf = lgbm_clf.predict(X_test)
    
    # Calculate metrics
    from sklearn.metrics import mean_absolute_error, accuracy_score
    
    mae_occupancy = mean_absolute_error(y_occ_test, preds_reg)
    accuracy_door = accuracy_score(y_door_test, preds_clf)
    
    print(f"Occupancy MAE: {mae_occupancy:.3f}")
    print(f"Door Accuracy: {accuracy_door:.3f}")
    
    print("\nSample predictions vs actual:")
    sample_size = min(10, len(y_occ_test))
    for i in range(sample_size):
        print(f"Occupancy: {y_occ_test.iloc[i]:.1f} -> {preds_reg[i]:.1f}")
        print(f"Door: {y_door_test.iloc[i]} -> {preds_clf[i]}")

# --- 6. Save both models together ---

# We save both models in a dictionary, so they can be loaded easier.
models = {
    'regressor': lgbm_reg,
    'classifier': lgbm_clf,
    'feature_names': ['hour_sin', 'hour_cos', 'day_of_week', 'is_weekend', 'is_business_hours']
}

model_path = 'models/occupancy_model.pkl'
# Ensure the directory exists
os.makedirs(os.path.dirname(model_path), exist_ok=True)
joblib.dump(models, model_path)

print(f"Both models successfully trained and saved together under {model_path}.")
print(f"Training completed with {len(df)} snapshots from {len(df_raw)} raw events.")
