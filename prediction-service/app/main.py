import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Body, Header
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from typing import Optional
import asyncio

# --- Configuration ---
# Path to model file, as expected in Docker container
MODEL_PATH = "models/occupancy_model.pkl"

# Load the database URL from environment variables (set by Docker Compose)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set!")

# Load API key from environment variable
STATIC_API_KEY = os.getenv("STATIC_API_KEY")
if not STATIC_API_KEY:
    raise ValueError("STATIC_API_KEY environment variable not set!")

# Load training interval from environment variable
TRAINING_INTERVAL = os.getenv("TRAINING_INTERVAL")
if not TRAINING_INTERVAL:
    raise ValueError("TRAINING_INTERVAL environment variable not set!")

# Convert TRAINING_INTERVAL to integer (seconds)
try:
    TRAINING_INTERVAL = int(TRAINING_INTERVAL)
except ValueError:
    raise ValueError("TRAINING_INTERVAL must be a valid integer representing seconds!")

# --- Database connection ---
try:
    engine = create_engine(DATABASE_URL)
except Exception as e:
    print(f"Could not establish database connection: {e}")
    engine = None

# --- API Key Authentication ---
async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Verifies that the provided API key matches the static API key."""
    if x_api_key != STATIC_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key. Please provide a valid X-API-Key header."
        )
    return x_api_key

# --- API data models (with Pydantic) ---
class PredictionRequest(BaseModel):
    timestamp: str

class PredictionResponse(BaseModel):
    predicted_occupancy: float
    prediction_isDoorOpen: bool
    prediction_for_timestamp: datetime
    last_trained_at: datetime | None # When was the model trained?

# --- FastAPI application ---
app = FastAPI(
    title="Occupancy Prediction API",
    description="An API for predicting room occupancy."
)

# Global namespace for storing model and metadata
model_cache = {
    "model": None, # Dictionary with two keys: {'regressor': ..., 'classifier': ...}
    "model_timestamp": None
}

# --- Load model on application startup ---
@app.on_event("startup")
def load_model():
    """Loads the model(s) from the .pkl file into memory."""
    try:
        if os.path.exists(MODEL_PATH):
            model_cache["model"] = joblib.load(MODEL_PATH)
            # Store when the model file was last modified
            model_cache["model_timestamp"] = datetime.fromtimestamp(os.path.getmtime(MODEL_PATH))
            print("Model dictionary loaded successfully.")
        else:
            print("WARNING: Model file not found. The /predict endpoint will not work.")
    except Exception as e:
        print(f"Error loading model: {e}")

# --- Helper function: Get current data from DB ---
def get_latest_occupancy_data():
    """Retrieves the latest lag and rolling values from the database."""
    if not engine:
        raise HTTPException(status_code=503, detail="Database connection not available.")
        
    # This query is an example. It should retrieve the latest values for the features
    # that the model used for training (lag/rolling).
    # A simple approximation is to take the very last entry.
    query = "SELECT \"personCount\" FROM \"OccupancyEvent\" ORDER BY timestamp DESC LIMIT 1"
    
    try:
        with engine.connect() as connection:
            result = connection.execute(text(query)).fetchone()
            if result:
                return {
                    "lag_15m": result[0],
                    "lag_1h": result[0],
                    "rolling_mean_1h": result[0]
                }
            return None # If the database is empty
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

# --- Periodisches Training als Background-Task ---
# Since the Environment variables are not available in the crontab, we need to run the training in the background.
async def periodic_training():
    while True:
        try:
            print("[BackgroundTask] Start automatic training...")
            exit_code = os.system("python scripts/train.py")
            if exit_code != 0:
                print(f"[BackgroundTask] Training failed with exit code {exit_code}")
            else:
                print("[BackgroundTask] Training successful.")

                # reload model
                load_model()

                # check if model is loaded
                if model_cache["model"] is None:
                    raise HTTPException(status_code=503, detail="Model is not loaded. Please try again later.")
                
                # check if model is trained
                if model_cache["model_timestamp"] is None:
                    raise HTTPException(status_code=503, detail="Model is not trained. Please try again later.")
                
                return {"message": "Training completed successfully.", "model_timestamp": model_cache["model_timestamp"]}
        except Exception as e:
            print(f"[BackgroundTask] Error during training: {e}")
        await asyncio.sleep(TRAINING_INTERVAL)

@app.on_event("startup")
async def start_periodic_training():
    asyncio.create_task(periodic_training())

# --- API endpoints ---
@app.get("/", summary="Root endpoint")
def read_root(api_key: str = Depends(verify_api_key)):
    """Returns a simple welcome message."""
    return {"message": "Welcome to the Prediction API!"}

@app.get("/health", summary="Health Check")
def health_check(api_key: str = Depends(verify_api_key)):
    """Checks if the API is running and the model is loaded."""
    model_status = "loaded" if model_cache["model"] is not None else "not found"
    return {
        "status": "ok",
        "model_status": model_status,
        "model_last_trained": model_cache["model_timestamp"]
    }

@app.put("/train", summary="Train the model")
def train(api_key: str = Depends(verify_api_key)):
    """Trains the model with current data."""
    # run train script in scripts/train.py
    os.system("python scripts/train.py")

    # reload model
    load_model()

    # check if model is loaded
    if model_cache["model"] is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Please try again later.")
    
    # check if model is trained
    if model_cache["model_timestamp"] is None:
        raise HTTPException(status_code=503, detail="Model is not trained. Please try again later.")
    
    return {"message": "Training started."}

@app.post("/predict", response_model=PredictionResponse, summary="Predict room occupancy")
def predict(request: PredictionRequest, api_key: str = Depends(verify_api_key)):
    """
    Predicts occupancy and door status for a specific future time point.
    Example for a request body (JSON): {"timestamp": "2025-06-19T14:30:00"}
    """
    model_dict = model_cache.get("model")
    if model_dict is None or 'regressor' not in model_dict or 'classifier' not in model_dict:
        raise HTTPException(status_code=503, detail="Model is not loaded correctly. Please (re)train.")

    # Convert timestamp to datetime
    try:
        prediction_date = datetime.fromisoformat(request.timestamp)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid timestamp format. Please use ISO format (YYYY-MM-DDTHH:MM:SS).")

    # 1. Create time-based features from the target date
    hour = prediction_date.hour
    
    features = {
        'hour_sin': np.sin(2 * np.pi * hour / 24),
        'hour_cos': np.cos(2 * np.pi * hour / 24),
        'day_of_week': prediction_date.weekday(),
        'is_weekend': int(prediction_date.weekday() >= 5),
        'is_business_hours': int((hour >= 8) & (hour < 18)),
    }

    # 2. Convert features to a pandas DataFrame (used for both models)
    # IMPORTANT: The column order must exactly match that used during training!
    feature_order = ['hour_sin', 'hour_cos', 'day_of_week', 'is_weekend', 'is_business_hours']
    df_predict = pd.DataFrame([features], columns=feature_order)

    # 3. Make predictions with BOTH models
    # Predict occupancy
    regressor = model_dict['regressor']
    occupancy_prediction = regressor.predict(df_predict)
    predicted_occupancy = round(occupancy_prediction[0], 2)

    # Predict door status
    classifier = model_dict['classifier']
    door_prediction = classifier.predict(df_predict)
    predicted_door_open = bool(door_prediction[0])
    
    # 4. Return the combined results
    return {
        "predicted_occupancy": predicted_occupancy if predicted_occupancy > 0 else 0.0, # Avoid negative values
        "prediction_isDoorOpen": predicted_door_open,
        "prediction_for_timestamp": prediction_date,
        "last_trained_at": model_cache["model_timestamp"]
    }
