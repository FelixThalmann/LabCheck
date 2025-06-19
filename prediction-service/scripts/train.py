import os
import pandas as pd
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

# SQL query to fetch all relevant data
query = 'SELECT "timestamp", "personCount", "isDoorOpen" FROM "OccupancyEvent" ORDER BY "timestamp" ASC'

print("Loading data from database...")
print(f"DATABASE_URL: {DATABASE_URL}")
try:
    # Load data directly into a Pandas DataFrame.
    # parse_dates=['timestamp'] converts the column directly to a Datetime object.
    df = pd.read_sql(query, engine, parse_dates=['timestamp'])
except Exception as e:
    print(f"Error loading data: {e}")
    exit(1)

# Check if data was loaded
if df.empty:
    print("No data found in database. Training will be skipped.")
    exit(0)

print(f"{len(df)} records successfully loaded.")

# --- 3. Feature Engineering ---

# Set the timestamp as the DataFrame index, which is common for time series analysis
df.set_index('timestamp', inplace=True)

# 3.1. Time-based Features
df['hour'] = df.index.hour
df['day_of_week'] = df.index.dayofweek  # Monday=0, Sunday=6
df['day_of_month'] = df.index.day
df['month'] = df.index.month
df['is_weekend'] = (df.index.dayofweek >= 5).astype(int)

# 3.2. Lag and Rolling Window Features
# First, bring data to a fixed frequency to fill gaps
# and have consistent intervals for lag/rolling operations.
df_resampled = df['personCount'].resample('15T').mean().ffill()

df['lag_15m'] = df_resampled.shift(1)
df['lag_1h'] = df_resampled.shift(4)  # 4 * 15 minutes
df['rolling_mean_1h'] = df_resampled.rolling(window=4).mean()

# Remove rows with NaN values that arise from lag/rolling operations at the beginning
df.dropna(inplace=True)

if df.empty:
    print("Not enough data for lag/rolling features. Training will be skipped.")
    exit(0)

# --- 3.1. Data lockup ---

if DEBUG_PREDICTION:
    print(df.head(20))
    print(df['personCount'].value_counts())
    print(df['isDoorOpen'].value_counts())
    print(df.describe())

# --- 4. Model Training ---

print("Starting combined model training...")

# Target variable 1: Regression (occupancy)
y_occupancy = df['personCount']

# Target variable 2: Classification (door status)
# Convert Boolean (True/False) to Integer (1/0)
y_door = df['isDoorOpen'].astype(int)

# Features (what we use to predict) (for both models identical)
X = df[['hour', 'day_of_week', 'day_of_month', 'month', 'is_weekend', 'lag_15m', 'lag_1h', 'rolling_mean_1h']]

# Split data (shuffle=False is important for time series!) (same splits for both models)
X_train, X_test, y_occ_train, y_occ_test, y_door_train, y_door_test = train_test_split(
    X, y_occupancy, y_door, test_size=0.2, shuffle=False
)

# --- Model 1: Regression for occupancy ---
print("Train Regressions model for occupancy...")
# Initialize model
# lgbm = lgb.LGBMRegressor(
#     objective='regression_l1',
#     n_estimators=1000,
#     learning_rate=0.05,
#     num_leaves=20,
#     max_depth=5,
#     n_jobs=-1,
#     random_state=42
# )

# Initialize model with reduced parameters
lgbm_reg = lgb.LGBMRegressor(
    objective='regression_l1', 
    random_state=42
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
    class_weight='balanced' # to also consider less frequent classes (door closed is less frequent than door open)
)

lgbm_clf.fit(
    X_train, y_door_train, 
    eval_set=[(X_test, y_door_test)], 
    callbacks=[lgb.early_stopping(50, verbose=False)] # verbose=False for less log output in cronjob
)

# --- 4.2. Check predictions ---

if DEBUG_PREDICTION:
    preds_reg = lgbm_reg.predict(X_test)
    preds_clf = lgbm_clf.predict(X_test)
    print(list(zip(preds_reg, y_occ_test)))
    print(list(zip(preds_clf, y_door_test)))

# --- 5. Save both models together ---

# We save both models in a dictionary, so they can be loaded easier.
models = {
    'regressor': lgbm_reg,
    'classifier': lgbm_clf
}

model_path = 'models/occupancy_model.pkl'
# Ensure the directory exists
os.makedirs(os.path.dirname(model_path), exist_ok=True)
joblib.dump(models, model_path)

print(f"Both models successfully trained and saved together under {model_path}.")