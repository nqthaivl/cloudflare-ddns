FROM python:3.11-slim

LABEL maintainer="nqthaivl"
LABEL description="Cloudflare DDNS Manager - Web UI for managing Cloudflare DNS and Dynamic DNS"
LABEL org.opencontainers.image.source="https://github.com/nqthaivl/cloudflare-ddns"

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Expose port
EXPOSE 9797

# Environment variables
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1
ENV CF_DDNS_PORT=9797

# Health check
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:9797/api/ip', timeout=5)" || exit 1

# Run
CMD ["python", "app.py"]
