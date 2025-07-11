# LabCheck

## Setup (linux based systems)

Locate the `.env` file in the root directory.
Copy the `.env` file to the different directories (backend, frontend, prediction-service).

```bash
./sync-env.sh
```

## How to run the project

### Run/Stop as production

Run all services:
```bash
docker-compose up -d
```

Stop all containers:
```bash
docker stop $(docker ps -aq)
```

Stop all containers and remove:
```bash
docker-compose down
```

### Docker helper commands
Logs for all services (follow the logs):
```bash
docker-compose logs -f
```

Logs for one service (follow the logs):
```bash
docker-compose logs -f <service-name>
```

Rebuild the containers
```bash
docker-compose up -d --build
```

Remove images
```bash
docker image prune -f
```

Remove all containers and volumes
```bash
docker-compose down -v
```

Rebuild and run all services
```bash
docker-compose build --no-cache && docker-compose up -d
```

## Database

To interact with the database from the outside, modify the `.env` file and update the `DATABASE_URL` variable for the localhost.

### Show data in database

```bash
cd backend
npx prisma studio
```

### Add demo data to database

```bash
cd backend
npm run db:seed:test 
```

or

```bash
cd backend
npx ts-node scripts/import-csv.ts data-generator/output/room_d4c6ogy1g0i6v8mv74fd1zwj/lstm_training_data.csv
```

## Frontend - Flutter

[Frontend README](frontend/README.md)

## Backend - NestJS, PostgreSQL, MQTT

[Backend README](backend/README.md)

### API Documentation (Swagger)
Once the backend is running, access the interactive API documentation at: http://localhost:3001/api/docs

## Prediction Service - Python

[Prediction Service README](prediction-service/README.md)

## Hardware

[Hardware README](hardware/README.md)