FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
ENV PRESCRIPTION_OCR_PROVIDER=local PRESCRIPTION_STORAGE=gridfs
ENV OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MALLOC_ARENA_MAX=2
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements-deploy.txt requirements-admin.txt requirements-prescription.txt ./
RUN python -m pip install -r requirements-deploy.txt
# Validate bundled CPU OCR models at build time; no private files or credentials.
RUN python -c "from rapidocr import RapidOCR; RapidOCR()"
COPY app ./app
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --limit-concurrency 8 --timeout-keep-alive 5"]
