# LabCheck Backend

A comprehensive backend system for laboratory monitoring, occupancy tracking, and machine learning predictions. Built with NestJS, PostgreSQL, and MQTT for real-time sensor data processing.

## Table of Contents

- [LabCheck Backend](#labcheck-backend)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Architecture](#architecture)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Quick Start with Docker Compose](#quick-start-with-docker-compose)
  - [Manual Setup](#manual-setup)
    - [1. Database Setup](#1-database-setup)
    - [2. MQTT Broker Setup](#2-mqtt-broker-setup)
    - [3. Backend Installation](#3-backend-installation)
    - [4. Prediction Service (Optional)](#4-prediction-service-optional)
  - [Development](#development)
    - [Available Scripts](#available-scripts)
    - [Project Structure](#project-structure)
  - [Testing](#testing)
  - [API Documentation](#api-documentation)
    - [Features](#features)
    - [Key Endpoints](#key-endpoints)
      - [Lab Status (`/api/lab/*`)](#lab-status-apilab)
      - [Predictions (`/api/predictions/*`)](#predictions-apipredictions)
      - [Health Check](#health-check)
    - [Authentication](#authentication)
  - [Database Schema](#database-schema)
    - [Key Relationships](#key-relationships)
  - [MQTT Integration](#mqtt-integration)
    - [Supported Event Types](#supported-event-types)
  - [Production Deployment](#production-deployment)
    - [Docker Production Build](#docker-production-build)
    - [Environment Considerations](#environment-considerations)
    - [Health Checks](#health-checks)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Logs](#logs)

## Overview

LabCheck Backend provides:
- **Real-time laboratory monitoring** via MQTT sensor data ingestion
- **REST API** for laboratory status and capacity management
- **Machine learning predictions** for daily and weekly occupancy forecasting
- **WebSocket events** for real-time updates
- **API key authentication** for secure access
- **Demo mode** for testing and presentations

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32 Sensors │    │   MQTT Broker   │    │   NestJS Backend│
│   (Hardware)    │───▶│   (Mosquitto)   │───▶│   (REST API)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │  PostgreSQL DB  │◀───────────┘
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │ Prediction      │
                       │ Service (ML)    │
                       └─────────────────┘
```

## Prerequisites

- [Node.js](https://nodejs.org/) (>= 18.x)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Git](https://git-scm.com/)

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL="postgresql://admin:admin@localhost:5432/labcheck_db?schema=public"

# MQTT Configuration
MQTT_BROKER_URL="mqtt://localhost:1883"

# API Configuration
PORT=3001
STATIC_API_KEY="your-secure-api-key-here"

# Prediction Service
PREDICTION_SERVICE_URL="http://localhost:8000"
PORT_PREDICTION=8000
DEBUG_PREDICTION=false
TRAINING_INTERVAL=3600

# Demo Mode (for testing/presentations)
DEMO_MODE=false
DEMO_DAY="2024-01-15"

# Docker Compose Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=labcheck_db
PORT_BACKEND=3001
```

## Quick Start with Docker Compose

The easiest way to run the entire system:

```bash
# Clone the repository
git clone <repository-url>
cd LabCheck

# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
```

The system will be available at:
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **PostgreSQL**: localhost:5432
- **MQTT Broker**: localhost:1883

## Manual Setup

### 1. Database Setup

```bash
# Start PostgreSQL with Docker
docker run --name labcheck-postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=labcheck_db \
  -p 5432:5432 \
  -d postgres:15

# Or use the provided docker-compose
docker-compose up postgres -d
```

### 2. MQTT Broker Setup

```bash
# Start Mosquitto with Docker
docker run --name labcheck-mosquitto \
  -p 1883:1883 \
  -p 9001:9001 \
  -d eclipse-mosquitto:2.0

# Or use the provided docker-compose
docker-compose up mqtt -d
```

### 3. Backend Installation

```bash
cd backend

# Install dependencies
npm install

# Apply database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start the application
npm run start:dev
```

### 4. Prediction Service (Optional)

```bash
cd prediction-service

# Install Python dependencies
pip install -r requirements.txt

# Start the prediction service
python app/main.py
```

## Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugger

# Building
npm run build              # Build for production
npm run start:prod         # Start production build

# Database
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Create and apply migration
npx prisma generate        # Generate Prisma client

# Code Quality
npm run format             # Format code with Prettier
npm run lint               # Lint and fix code
```

### Project Structure

```
src/
├── auth/                  # Authentication (API key)
├── core/                  # Core services (demo mode)
├── door/                  # Door event models
├── events/                # WebSocket events
├── lab-status/            # Laboratory status API
├── mqtt/                  # MQTT message handling
├── occupancy/             # Occupancy management
├── predictions/           # ML prediction endpoints
└── prisma/                # Database service
```

## Testing

```bash
# Unit tests
npm run test
npm run test:watch
npm run test:cov

# End-to-end tests
npm run test:e2e

# Debug tests
npm run test:debug
```

## API Documentation

Once the application is running, visit http://localhost:3001/api/docs for interactive API documentation with Swagger UI.

### Features
- **Interactive Testing**: Try out endpoints directly from the browser
- **Request/Response Examples**: See expected data formats
- **Authentication**: Configure API key for protected endpoints
- **Filtering**: Search and filter endpoints by tags
- **Schema Validation**: Automatic validation of request/response schemas

### Key Endpoints

#### Lab Status (`/api/lab/*`)
- `GET /api/lab/status` - Current laboratory status and occupancy
- `GET /api/lab/capacity` - Get current laboratory capacity
- `POST /api/lab/capacity` - Set laboratory capacity (requires password)
- `POST /api/lab/current-capacity` - Set current capacity (requires password)
- `POST /api/lab/entrance-direction` - Set entrance direction (requires password)
- `POST /api/lab/login` - Login endpoint

#### Predictions (`/api/predictions/*`)
- `GET /api/predictions/day` - Daily occupancy predictions (optional date parameter)
- `GET /api/predictions/week` - Weekly occupancy predictions (current and next week)
- `POST /api/predictions/single` - Single ML prediction for specific timestamp

#### Health Check
- `GET /` - Basic health check endpoint

### Authentication

Most endpoints require API key authentication:
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3001/api/lab/status
```

## Database Schema

The system uses PostgreSQL with the following main entities:

- **Room**: Laboratory rooms with capacity and settings
- **Sensor**: ESP32 sensors with location and type information
- **Event**: Door and passage events from sensors
- **DayPrediction**: Daily occupancy predictions
- **WeekPrediction**: Weekly occupancy predictions

### Key Relationships

- Each room can have multiple sensors
- Sensors generate events that are linked to rooms
- Predictions are generated per room and time period

## MQTT Integration

The system receives sensor data via MQTT messages:

**Topic Format**: `labcheck/room/{roomId}/sensor/{sensorId}/event`

**Message Format**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "personCount": 1,
  "isDoorOpen": true,
  "eventType": "DOOR_EVENT"
}
```

### Supported Event Types

- `DOOR_EVENT`: Door open/close events
- `PASSAGE_EVENT`: Person passage detection
- `TEST_EVENT`: Test events for development

## Production Deployment

### Docker Production Build

```bash
# Build production image
docker build -t labcheck-backend:latest .

# Run with environment variables
docker run -d \
  --name labcheck-backend \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e MQTT_BROKER_URL="mqtt://host:1883" \
  -e STATIC_API_KEY="your-secure-key" \
  labcheck-backend:latest
```

### Environment Considerations

- Use strong API keys in production
- Configure proper database credentials
- Set up reverse proxy (nginx) for SSL termination
- Configure proper MQTT authentication
- Set up monitoring and logging
- Use environment-specific configuration

### Health Checks

The application provides health check endpoints:
- `GET /` - Basic health check
- `GET /health` - Detailed health status

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Ensure migrations are applied

2. **MQTT Connection Failed**
   - Verify Mosquitto broker is running
   - Check MQTT_BROKER_URL
   - Verify network connectivity

3. **API Key Authentication Fails**
   - Verify STATIC_API_KEY is set
   - Check X-API-Key header format
   - Ensure key matches environment variable

### Logs

```bash
# View application logs
docker-compose logs -f backend

# View database logs
docker-compose logs -f postgres

# View MQTT logs
docker-compose logs -f mqtt
```