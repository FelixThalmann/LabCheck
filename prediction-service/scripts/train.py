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

# --- 2. Load Data from Database ---

# SQL query to fetch all relevant data
query = 'SELECT "timestamp", "personCount" FROM "OccupancyEvent" ORDER BY "timestamp" ASC'

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


# --- 3. Feature Engineering (This part starts now) ---

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


# --- 4. Model Training ---

print("Starting model training...")

# Target variable (what we want to predict)
y = df['personCount']
# Features (what we use to predict)
X = df[['hour', 'day_of_week', 'day_of_month', 'month', 'is_weekend', 'lag_15m', 'lag_1h', 'rolling_mean_1h']]

# Split data (shuffle=False is important for time series!)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

# Initialize model
lgbm = lgb.LGBMRegressor(
    objective='regression_l1',
    n_estimators=1000,
    learning_rate=0.05,
    num_leaves=20,
    max_depth=5,
    n_jobs=-1,
    random_state=42
)

# Train model with Early Stopping
lgbm.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    eval_metric='l1',
    callbacks=[lgb.early_stopping(100, verbose=False)] # verbose=False for less log output in cronjob
)

# --- 5. Save Model ---

model_path = 'models/occupancy_model.pkl'
# Ensure the directory exists
os.makedirs(os.path.dirname(model_path), exist_ok=True)
joblib.dump(lgbm, model_path)

print(f"Model successfully trained and saved under {model_path}.")