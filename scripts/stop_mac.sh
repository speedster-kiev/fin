#!/bin/bash
docker stop finally-app 2>/dev/null || true
docker rm finally-app 2>/dev/null || true
echo "Stopped."
