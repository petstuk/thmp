FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY thmp_common /app/thmp_common
COPY hypothesis_service /app/hypothesis_service
RUN pip install --no-cache-dir -e /app/thmp_common -e /app/hypothesis_service
ENV PYTHONPATH=/app/hypothesis_service
WORKDIR /app/hypothesis_service
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
