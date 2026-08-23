FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libpangoft2-1.0-0 \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        libffi8 \
        libglib2.0-0 \
        libharfbuzz0b \
        libfribidi0 \
        fontconfig \
        fonts-liberation \
        shared-mime-info \
        gosu \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1000 appuser \
    && useradd --system --uid 1000 --gid appuser --create-home --home-dir /app appuser

WORKDIR /app

COPY requirements/base.txt requirements/production.txt /app/requirements/
RUN pip install --no-cache-dir -r /app/requirements/production.txt

COPY --chown=appuser:appuser . /app
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh \
    && mkdir -p /app/staticfiles /app/logs /app/media \
    && chown -R appuser:appuser /app/staticfiles /app/logs /app/media

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "main.asgi:application", "--bind", "0.0.0.0:8000", "--worker-class", "uvicorn.workers.UvicornWorker", "--workers", "3", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]
