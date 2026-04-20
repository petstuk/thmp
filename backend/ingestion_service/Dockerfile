FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY backend/thmp_common /app/thmp_common
COPY backend/thmp_cdk /app/thmp_cdk
COPY connectors/example_webhook /app/connectors/example_webhook
COPY backend/ingestion_service /app/ingestion_service
RUN pip install --no-cache-dir \
    -e /app/thmp_common \
    -e /app/thmp_cdk \
    -e /app/connectors/example_webhook \
    -e /app/ingestion_service
ENV PYTHONPATH=/app/ingestion_service
WORKDIR /app/ingestion_service
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
