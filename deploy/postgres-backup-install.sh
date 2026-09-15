#!/usr/bin/env bash
# One-time installer for Kollabo Postgres backups.
# Run on VPS as root: bash postgres-backup-install.sh
#
# Does:
#   1. mkdir /var/backups/kollabo
#   2. copy backup script to /usr/local/bin/kollabo-backup.sh
#   3. write /root/.pgpass (chmod 600) — uses password from /root/.kollabo/dbpass
#   4. install crontab entry: 03:00 daily
#   5. test-run once

set -euo pipefail

BACKUP_SCRIPT_SRC="$(cd "$(dirname "$0")" && pwd)/postgres-backup.sh"
BACKUP_DIR="/var/backups/kollabo"
TARGET_SCRIPT="/usr/local/bin/kollabo-backup.sh"
PGPASS="/root/.pgpass"
DBPASS_FILE="/root/.kollabo/dbpass"

if [[ "$EUID" -ne 0 ]]; then
    echo "ERROR: must run as root" >&2
    exit 1
fi

if [[ ! -f "${DBPASS_FILE}" ]]; then
    echo "ERROR: ${DBPASS_FILE} not found" >&2
    exit 1
fi

if [[ ! -f "${BACKUP_SCRIPT_SRC}" ]]; then
    echo "ERROR: source script not found: ${BACKUP_SCRIPT_SRC}" >&2
    exit 1
fi

DB_PASS="$(cat "${DBPASS_FILE}")"

echo "[1/5] Creating backup dir ${BACKUP_DIR} ..."
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[2/5] Installing backup script to ${TARGET_SCRIPT} ..."
install -m 750 "${BACKUP_SCRIPT_SRC}" "${TARGET_SCRIPT}"

echo "[3/5] Writing /root/.pgpass ..."
cat > "${PGPASS}" <<EOF
127.0.0.1:5432:kollabo:kollabo:${DB_PASS}
localhost:5432:kollabo:kollabo:${DB_PASS}
EOF
chmod 600 "${PGPASS}"

echo "[4/5] Installing crontab entry (03:00 daily) ..."
CRON_LINE="0 3 * * * /usr/local/bin/kollabo-backup.sh >/dev/null 2>&1"
# Append only if not already present (idempotent)
( crontab -l 2>/dev/null | grep -Fv "${TARGET_SCRIPT}" || true; echo "${CRON_LINE}" ) | crontab -
crontab -l | grep -F "${TARGET_SCRIPT}" || echo "WARN: crontab entry not found after install"

echo "[5/5] Test-run ..."
"${TARGET_SCRIPT}"

echo ""
echo "=== Installed ==="
echo "  Script:  ${TARGET_SCRIPT}"
echo "  Backups: ${BACKUP_DIR}"
echo "  Cron:    03:00 daily (verify: crontab -l)"
echo "  Test:    ran once just now — check ${BACKUP_DIR}/backup.log and the .dump.gz file"
