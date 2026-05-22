FROM python:3.12-slim

WORKDIR /app

COPY attack_suggest_service/pyproject.toml attack_suggest_service/
RUN pip install --no-cache-dir -e attack_suggest_service/

COPY attack_suggest_service/ attack_suggest_service/

# Pre-download the model during image build so containers start fast.
# Model: all-MiniLM-L6-v2 (~90 MB). Cached in /root/.cache/torch/sentence_transformers.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" || true

WORKDIR /app/attack_suggest_service
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
