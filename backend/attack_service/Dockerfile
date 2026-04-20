FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY thmp_common /app/thmp_common
COPY attack_service /app/attack_service
RUN pip install --no-cache-dir -e /app/thmp_common -e /app/attack_service
ENV PYTHONPATH=/app/attack_service
WORKDIR /app/attack_service
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
