#!/bin/sh
# =============================================================================
# Docker Entrypoint — HK Management Systems Backend
#
# Runs automatically on every container start (UAT / Production).
# Order is intentional: wait → migrate → seed → collectstatic → serve.
# =============================================================================

set -e  # Exit immediately on any error

echo "──────────────────────────────────────────"
echo "  HK Management Systems — Backend startup"
echo "  ENV: ${DJANGO_ENV:-production}"
echo "──────────────────────────────────────────"

# ── 1. Wait for Postgres to be ready ────────────────────────────────────────
if [ -n "$DB_HOST" ]; then
  echo "[1/5] Waiting for database at $DB_HOST:${DB_PORT:-5432}..."
  until python -c "
import sys, psycopg2, os
try:
    psycopg2.connect(
        dbname=os.environ.get('DB_NAME','hk_management'),
        user=os.environ.get('DB_USER','postgres'),
        password=os.environ.get('DB_PASSWORD','postgres'),
        host=os.environ.get('DB_HOST','db'),
        port=os.environ.get('DB_PORT','5432'),
    )
    sys.exit(0)
except Exception:
    sys.exit(1)
"; do
    echo "   → Database not ready, retrying in 2s..."
    sleep 2
  done
  echo "   ✓ Database is ready"
else
  echo "[1/5] Skipping DB wait (DB_HOST not set)"
fi

# ── 2. Apply database migrations ────────────────────────────────────────────
echo "[2/5] Running migrations..."
python manage.py migrate --noinput
echo "   ✓ Migrations applied"

# ── 3. Load / refresh occupational health protocol seed data ────────────────
#
#   load_occ_protocols is fully idempotent (uses get_or_create).
#   It will:
#     - Add new exam catalog entries that don't exist yet
#     - Add new sectors / departments / positions / protocols
#     - Leave existing records untouched (no data loss)
#
echo "[3/5] Loading occupational health protocol data..."
python manage.py load_occ_protocols
echo "   ✓ Protocol data loaded"

# ── 4. Collect static files ─────────────────────────────────────────────────
echo "[4/5] Collecting static files..."
python manage.py collectstatic --noinput --clear
echo "   ✓ Static files collected"

# ── 5. Start gunicorn ───────────────────────────────────────────────────────
echo "[5/5] Starting Gunicorn..."
WORKERS=${GUNICORN_WORKERS:-3}
TIMEOUT=${GUNICORN_TIMEOUT:-120}

exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "$WORKERS" \
  --timeout "$TIMEOUT" \
  --log-level "${GUNICORN_LOG_LEVEL:-info}" \
  --access-logfile - \
  --error-logfile -
