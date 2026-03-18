FROM python:3.11-slim

LABEL maintainer="Nexios AI Sandbox"
LABEL version="1.0"
LABEL description="Nexios Python 3.11 runtime image"

WORKDIR /workspace

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash curl git \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1

COPY . .

RUN if [ -f "requirements.txt" ]; then pip install --no-cache-dir -r requirements.txt; fi

EXPOSE 8000 5000

CMD ["python3", "main.py"]
