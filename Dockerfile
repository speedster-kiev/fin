# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python backend with static frontend
FROM python:3.12-slim
WORKDIR /app

RUN pip install uv

COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --no-dev

COPY backend/ .
COPY --from=frontend-builder /app/out ./static

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
