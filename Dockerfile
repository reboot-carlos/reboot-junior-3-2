# Étape 1 : Construire le frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install --silent
COPY frontend .
RUN NODE_ENV=production npm run build

# Étape 2 : Construire le backend avec les dépendances Python
FROM python:3.12-slim AS backend-builder
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Étape 3 : Runtime final
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copier les dépendances Python
COPY --from=backend-builder /app/wheels /wheels
COPY --from=backend-builder /app/requirements.txt .
RUN pip install --no-cache /wheels/* && rm -rf /wheels

# Copier le code backend
COPY backend .

# Copier les fichiers statiques du frontend
COPY --from=frontend-builder /frontend/dist ./static

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
