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
curl http://localhost:8080/health
```

### Train the model

```bash
curl -X PUT http://localhost:8080/train
```

### Predict the occupancy

```bash
curl -X POST http://localhost:8080/predict -H "Content-Type: application/json" -d '{"timestamp": "2025-06-19T14:30:00"}'
```