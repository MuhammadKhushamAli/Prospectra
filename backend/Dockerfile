# ------------------------------------------------------------------------------
# Stage 1: Build & Dependencies
# ------------------------------------------------------------------------------
FROM python:3.13-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Install minimal OS build dependencies needed for compiling C extensions (lxml, cryptography, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libxml2-dev \
    libxslt1-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create isolated Python virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install Python dependencies into /opt/venv
# Leverages Docker layer caching: this layer only re-runs when requirements.txt changes
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt


# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM python:3.13-slim AS runtime

# Runtime environment settings
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000 \
    APP_USER=appuser \
    APP_UID=10001

WORKDIR /app

# Install minimal shared runtime libraries (ca-certificates for HTTPS/TLS, XML/XSLT libraries)
# Create dedicated unprivileged non-root user
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libxml2 \
    libxslt1.1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid "${APP_UID}" "${APP_USER}" \
    && useradd --uid "${APP_UID}" --gid "${APP_UID}" --create-home --shell /bin/bash "${APP_USER}"

# Copy compiled virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy backend application source code with non-root ownership
COPY --chown=${APP_USER}:${APP_USER} . /app

# Switch to unprivileged security context
USER ${APP_USER}

# Expose HTTP port
EXPOSE 8000

# Container Healthcheck (uses native Python to avoid requiring curl/wget binaries)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request, os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", 8000)}/docs')" || exit 1

# Default execution: run FastAPI web service with Uvicorn
# To run background ARQ worker instead, override CMD with: ["python", "worker.py"]
CMD ["uvicorn", "app.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--no-access-log"]
