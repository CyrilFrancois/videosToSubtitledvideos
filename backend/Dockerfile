FROM python:3.10-slim

# Install system dependencies
# Added curl for healthchecks and build-essential for library compatibility
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Volume mounting in docker-compose handles the code during dev,
# but we keep the CMD consistent for the container lifecycle.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]