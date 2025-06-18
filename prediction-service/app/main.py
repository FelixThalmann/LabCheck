import os
import joblib
import pandas as pd
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Body
from pydantic import BaseModel
from sqlalchemy import create_engine, text

# --- Configuration ---
# Path to model file, as expected in Docker container
MODEL_PATH = "/app/models/occupancy_model.pkl"

# Database connection from environment variables (set by Docker Compose)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://labcheck:labcheck@postgres:5432/labcheck_db")

# --- Database connection ---
try:
    engine = create_engine(DATABASE_URL)
except Exception as e:
    print(f"Could not establish database connection: {e}")
    engine = None

# --- API data models (with Pydantic) ---
class PredictionRequest(BaseModel):
    timestamp: str

class PredictionResponse(BaseModel):
    predicted_occupancy: float
    prediction_for_timestamp: datetime
    model_last_trained: datetime | None # When was the model trained?

# --- FastAPI application ---
app = FastAPI(
    title="Occupancy Prediction API",
    description="An API for predicting room occupancy."
)

# Global namespace for storing model and metadata
model_cache = {
    "model": None,
    "model_timestamp": None
}

# --- Load model on application startup ---
@app.on_event("startup")
def load_model():
    """Loads the model from the .pkl file into memory."""
    try:
        if os.path.exists(MODEL_PATH):
            model_cache["model"] = joblib.load(MODEL_PATH)
            # Store when the model file was last modified
            model_cache["model_timestamp"] = datetime.fromtimestamp(os.path.getmtime(MODEL_PATH))
            print("Model loaded successfully.")
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
                # Here we assume that the last known occupancy is a good
                # estimate for all lag/rolling features.
                # In a more complex version, more logic could be built in here.
                return {
                    "lag_15m": result[0],
                    "lag_1h": result[0],
                    "rolling_mean_1h": result[0]
                }
            return None # If the database is empty
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


# --- API endpoints ---
@app.get("/", summary="Root endpoint")
def read_root():
    """Returns a simple welcome message."""
    return {"message": "Welcome to the Prediction API!"}

@app.get("/health", summary="Health Check")
def health_check():
    """Checks if the API is running and the model is loaded."""
    model_status = "loaded" if model_cache["model"] is not None else "not found"
    return {
        "status": "ok",
        "model_status": model_status,
        "model_last_trained": model_cache["model_timestamp"]
    }

@app.put("/train", summary="Train the model")
def train():
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
def predict(request: PredictionRequest, latest_data: dict = Depends(get_latest_occupancy_data)):
    """
    Predicts occupancy for a specific future time point.
    Example for a request body (JSON): {"timestamp": "2025-06-19T14:30:00"}
    """
    if model_cache["model"] is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Please try again later.")
    
    if latest_data is None:
        raise HTTPException(status_code=404, detail="No data found in database to create lag features.")

    # convert timestamp to datetime
    prediction_date = datetime.fromisoformat(request.timestamp)

    # 1. Create time-based features from the target date
    features = {
        'hour': prediction_date.hour,
        'day_of_week': prediction_date.weekday(),
        'day_of_month': prediction_date.day,
        'month': prediction_date.month,
        'is_weekend': (prediction_date.weekday() >= 5),
    }

    # 2. Add the approximated lag/rolling features
    features.update(latest_data)

    # 3. Convert features to a pandas DataFrame in the correct order
    # IMPORTANT: The column order must exactly match that used during training!
    feature_order = ['hour', 'day_of_week', 'day_of_month', 'month', 'is_weekend', 'lag_15m', 'lag_1h', 'rolling_mean_1h']
    df_predict = pd.DataFrame([features], columns=feature_order)

    # 4. Make the prediction
    prediction = model_cache["model"].predict(df_predict)
    
    # The result is an array, we want the first (and only) value
    predicted_value = round(prediction[0], 2)

    return {
        "predicted_occupancy": predicted_value if predicted_value > 0 else 0.0, # Avoid negative predictions
        "prediction_for_timestamp": prediction_date,
        "model_last_trained": model_cache["model_timestamp"]
    }