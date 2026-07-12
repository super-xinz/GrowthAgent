FROM python:3.12-slim
WORKDIR /app
COPY apps/api ./apps/api
COPY packages ./packages
RUN pip install --no-cache-dir -e './apps/api[dev]'
ENV PYTHONPATH=/app/apps/api:/app
WORKDIR /app/apps/api
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
