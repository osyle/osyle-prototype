FROM python:3.11-slim

WORKDIR /app

COPY services/backend/requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY services/backend ./services/backend

EXPOSE 8000

CMD ["uvicorn", "services.backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
