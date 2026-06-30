#!/bin/bash
set -e

IMAGE=finally
CONTAINER=finally-app

if [ "$1" = "--build" ] || ! docker image inspect $IMAGE &>/dev/null; then
  docker build -t $IMAGE .
fi

if docker ps -q -f name=$CONTAINER | grep -q .; then
  echo "Already running: http://localhost:8000"
  exit 0
fi

docker run -d \
  --name $CONTAINER \
  -v finally-data:/app/db \
  -p 8000:8000 \
  --env-file .env \
  $IMAGE

echo "Started: http://localhost:8000"
open http://localhost:8000 2>/dev/null || true
