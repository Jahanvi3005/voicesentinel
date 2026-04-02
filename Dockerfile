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

# OPTIMIZATION:
# Prevent pip from attempting to download the 2.5GB CUDA version of PyTorch
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
# Set timeout to prevent large models from failing
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# Copy project files
COPY . .

# Expose the mandatory Hugging Face port
EXPOSE 7860

# Command to start the application with uvicorn scaling on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
