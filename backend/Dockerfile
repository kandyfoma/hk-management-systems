# =============================================================================
# Dockerfile — KAT Management Systems Backend
# =============================================================================
FROM python:3.11-slim

# Prevents .pyc files and enables stdout/stderr flush
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Ensure UTF-8 locale so Unicode chars in management commands don't crash stdout
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /app

# System dependencies (psycopg2 needs libpq-dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project source
COPY . .

# Copy & set entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
