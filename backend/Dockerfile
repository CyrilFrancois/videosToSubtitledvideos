FROM python:3.10-slim

# Install system dependencies (only runs once)
RUN apt-get update && apt-get install -y ffmpeg git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps (only re-runs if requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# We don't need to COPY . . here for dev because 
# docker-compose volumes will handle it!
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]