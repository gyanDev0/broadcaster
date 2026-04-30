# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Install FFmpeg (This is how we fix the path warning for the cloud!)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the server code
COPY . .

# Expose the port Flask runs on
EXPOSE 5000

# Start the server using Waitress for production
CMD ["python", "deploy_server.py"]
