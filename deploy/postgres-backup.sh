#!/usr/bin/env bash
# Postgres nightly backup for Kollabo.
# Runs via cron at 03:00 PKT daily.
# Strategy: pg_dump custom-format (-Fc) compressed, dated filename, 7-day retention.
#
# Auth: reads password from /root/.pgpass (chmod 600). Format:
#   127.0.0.1:5432:kollabo:kollabo:<password>
#
# Owner: root (cron runs as root). Set up by deploy/postgres-backup-install.sh.

set -euo pipefail

BACKUP_DIR="/var/backups/kollabo"
DB_NAME="kollabo"
DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_USER="kollabo"
RETENTION_DAYS=7
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}-${TIMESTAMP}.dump.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date -Iseconds)] $*" | tee -a "${LOG_FILE}"
}

log "=== Backup start: ${DB_NAME} ==="

# pg_dump custom-format -> gzip -> dated file
pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -Fc \
    --no-owner \
    --no-privileges \
    2>>"${LOG_FILE}" \
    | gzip -9 > "${BACKUP_FILE}"

# Sanity check: non-empty + valid gzip
if [[ ! -s "${BACKUP_FILE}" ]]; then
    log "ERROR: backup file is empty: ${BACKUP_FILE}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
log "Backup written: ${BACKUP_FILE} (${SIZE})"

# Retention: delete dumps older than N days (keep .gz + .dump.gz)
find "${BACKUP_DIR}" -maxdepth 1 -type f -name "${DB_NAME}-*.dump.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}" -maxdepth 1 -type f -name "${DB_NAME}-*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

REMAINING=$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "${DB_NAME}-*.dump.gz" | wc -l)
log "Retention applied: kept ${REMAINING} backup(s) (max ${RETENTION_DAYS} days)"

# Disk usage warning
USAGE=$(df -h "${BACKUP_DIR}" | tail -1 | awk '{print $5}' | tr -d '%')
if [[ "${USAGE}" -ge 80 ]]; then
    log "WARN: disk usage at ${USAGE}%"
fi

log "=== Backup done ==="
