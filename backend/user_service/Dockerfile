FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY thmp_common /app/thmp_common
COPY user_service /app/user_service
RUN pip install --no-cache-dir -e /app/thmp_common -e /app/user_service
ENV PYTHONPATH=/app/user_service
WORKDIR /app/user_service
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
