#!/bin/bash
set -e

echo "Stopping backend service..."
docker compose stop be

echo "Docker compose pull"
docker compose pull

echo "Building backend image..."
docker compose build be

echo "Starting backend service..."
docker compose up -d --remove-orphans be

echo "Done. Backend redeployed."
