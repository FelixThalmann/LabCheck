# Prediction Service

## Run in docker

Just restart the container:

```bash
docker-compose restart prediction-service
```

Build and start the container:

```bash
docker-compose up --build prediction-service
```

Only rebuild the image (optional):

```bash
docker-compose build prediction-service
```

## API Endpoints

### Health check

```bash
curl http://localhost:3100/health -H "X-API-Key: 0000000000"
```

output:

```json
{
    "status": "ok",
    "model_status": "loaded",
    "model_last_trained": "2025-06-19T13:05:02.476633"
}
```

### Train the model

```bash
curl -X POST http://localhost:3100/train -H "X-API-Key: 0000000000"
```

output:

```json
{
    "message": "Training started."
}
```

### Predict the occupancy for a specific timestamp
The model needs to be trained first. But the training is done automatically every day at 3:00 AM.
The timestamp must be in ISO format (YYYY-MM-DDTHH:MM:SS).

```bash
curl -X POST http://localhost:3100/predict \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 0000000000" \
  -d '{"timestamp": "2025-06-19T14:30:00"}'
```

output:

```json
{
    "predicted_occupancy": 1.0,
    "prediction_isDoorOpen": false,
    "prediction_for_timestamp": "2025-08-31T14:30:00",
    "model_last_trained": "2025-06-19T13:05:02.476633"
}
```