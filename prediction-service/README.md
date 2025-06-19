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
curl http://localhost:3100/health
```

### Train the model

```bash
curl -X PUT http://localhost:3100/train
```

### Predict the occupancy for a specific timestamp
The model needs to be trained first. But the training is done automatically every day at 3:00 AM.
The timestamp must be in ISO format (YYYY-MM-DDTHH:MM:SS).

```bash
curl -X POST http://localhost:3100/predict -H "Content-Type: application/json" -d '{"timestamp": "2025-06-19T14:30:00"}'
```