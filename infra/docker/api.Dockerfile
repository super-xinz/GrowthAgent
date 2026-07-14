FROM python:3.12-slim
WORKDIR /app
COPY apps/api ./apps/api
RUN pip install --no-cache-dir --retries 5 --timeout 120 -e './apps/api[dev]'
ENV PYTHONPATH=/app/apps/api:/app
WORKDIR /app/apps/api
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
