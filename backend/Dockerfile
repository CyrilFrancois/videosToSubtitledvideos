FROM python:3.10-slim

# 1. Environment configuration
# PYTHONUNBUFFERED: Essential for real-time progress bars in Docker logs
# OMP_NUM_THREADS: Helps faster-whisper manage CPU threads efficiently in containers
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    OMP_NUM_THREADS=4

# 2. Install system dependencies
# Added libgomp1 for faster-whisper/CTranslate2 compatibility
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Install Python dependencies
# Using --upgrade pip to ensure the latest wheel support for faster-whisper
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 4. Execution
# Using --reload for development; remove --reload for production deployments
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]