# Use a Python base image with Node.js support
FROM python:3.11-slim

# Install system dependencies including Node.js, npm, and Nginx
RUN apt-get update && apt-get install -y \
    curl \
    nginx \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy root configurations
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir uvicorn "crewai[google-genai]" litellm google-genai

# Copy backend codebase
COPY backend/ ./backend/
COPY agents/ ./agents/
COPY data/ ./data/

# Copy frontend codebase
COPY frontend/ ./frontend/

# Build Next.js frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Go back to /app
WORKDIR /app

# Copy Nginx config and startup script
COPY nginx.conf /etc/nginx/sites-available/default
COPY start.sh .
RUN chmod +x start.sh

# Expose Hugging Face Space port
EXPOSE 7860

# Run services
CMD ["./start.sh"]
