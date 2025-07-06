#!/bin/bash

set -e

# Copy central .env to all components
cp .env backend/.env
cp .env frontend/assets/.env
cp .env prediction-service/.env 

echo "Done syncing .env files"