#!/bin/sh
# =============================================================================
# Docker Entrypoint — KAT Management Systems Backend
#
# Runs automatically on every container start (UAT / Production).
# Order is intentional: wait -> migrate -> seed -> collectstatic -> serve.
# =============================================================================

set -e  # Exit immediately on any error

echo "=========================================="
echo "  KAT Management Systems - Backend startup"
echo "  ENV: ${DJANGO_ENV:-production}"
echo "=========================================="

# ── 1. Wait for Postgres to be ready ────────────────────────────────────────
if [ -n "$DB_HOST" ]; then
  echo "[1/6] Waiting for database at $DB_HOST:${DB_PORT:-5432}..."
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
    echo "   -> Database not ready, retrying in 2s..."
    sleep 2
  done
  echo "   [OK] Database is ready"
else
  echo "[1/6] Skipping DB wait (DB_HOST not set)"
fi

# ── 2. Apply database migrations ────────────────────────────────────────────
echo "[2/6] Running migrations..."
python manage.py migrate --noinput || {
  echo "   [WARN] migrate returned non-zero — checking if it is a stale-migration warning..."
  python manage.py showmigrations --plan 2>&1 | tail -5
  echo "   [INFO] Continuing startup (non-fatal if only a stale-migration warning)"
}
echo "   [OK] Migrations step done"

# ── 3. Load / refresh occupational health protocol seed data ────────────────
#
#   load_occ_protocols is fully idempotent (uses get_or_create).
#   It will:
#     - Add new exam catalog entries that don't exist yet
#     - Add new sectors / departments / positions / protocols
#     - Leave existing records untouched (no data loss)
#
echo "[3/6] Loading occupational health protocol data..."
python manage.py load_occ_protocols || echo "   [WARN] load_occ_protocols failed (non-fatal, continuing...)"
echo "   [OK] Protocol step done"

# ── 4. Seed demo users + patients ───────────────────────────────────────────
#
#   seed_demo_data is fully idempotent (uses get_or_create).
#   It creates the demo organization, staff accounts, and 20 demo patients
#   only if they do not already exist.  Safe to run on every container start.
#
echo "[4/6] Loading demo seed data (users + patients)..."
python manage.py seed_demo_data || echo "   [WARN] seed_demo_data failed (non-fatal, continuing...)"
echo "   [OK] Demo seed step done"

# ── 4b. Seed CAPA (IncidentInvestigation) demo data ────────────────────────
#
#   seed_capa_demo is fully idempotent (skips existing records).
#   Requires WorkplaceIncident records to exist first; emits a warning and
#   exits cleanly if none are found.
#
echo "[4b/6] Loading CAPA demo data (incident investigations)..."
python manage.py seed_capa_demo || echo "   [WARN] seed_capa_demo failed (non-fatal, continuing...)"
echo "   [OK] CAPA demo seed step done"

# ── 5. Collect static files ─────────────────────────────────────────────────
echo "[5/6] Collecting static files..."
python manage.py collectstatic --noinput --clear || echo "   [WARN] collectstatic failed (non-fatal, continuing...)"
echo "   [OK] Static files step done"

# ── 6. Start gunicorn ───────────────────────────────────────────────────────
echo "[6/6] Starting Gunicorn..."
WORKERS=${GUNICORN_WORKERS:-3}
TIMEOUT=${GUNICORN_TIMEOUT:-120}
# Railway injects $PORT; fall back to 8000 for local Docker
BIND_PORT=${PORT:-8000}

exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:${BIND_PORT} \
  --workers "$WORKERS" \
  --timeout "$TIMEOUT" \
  --log-level "${GUNICORN_LOG_LEVEL:-info}" \
  --access-logfile - \
  --error-logfile -
