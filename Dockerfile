FROM python:3.9-slim

# Set work directory
WORKDIR /app

# Install system dependencies
# libsndfile1 and ffmpeg are extremely critical for librosa/pydub audio processing
RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# CRITICAL FIX for Render Free Tier (512MB RAM):
# Prevent pip from attempting to download the 2.5GB CUDA version of PyTorch
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
# Set timeout to prevent large models from failing
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# Copy project files
COPY . .

# Expose dynamic port (Render injects $PORT)
EXPOSE 8080

# Command to start the application with uvicorn scaling
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
