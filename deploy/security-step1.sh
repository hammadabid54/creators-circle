#!/bin/bash
# Security step 1: apt upgrade + enable unattended-upgrades
set -e
export DEBIAN_FRONTEND=noninteractive
echo "[1/3] apt update..."
apt-get update -qq 2>&1 | tail -3
echo ""
echo "[2/3] apt upgrade (this may take 5-10 min)..."
apt-get upgrade -y -qq 2>&1 | tail -10
echo ""
echo "[3/3] enable unattended-updates for future safety..."
dpkg-reconfigure -f noninteractive -plow unattended-upgrades 2>&1 | tail -3
echo ""
echo "=== Done. Pending updates now: ==="
apt list --upgradable 2>/dev/null | wc -l
echo ""
echo "=== Reboot required? ==="
if [ -f /var/run/reboot-required ]; then
  echo "YES - kernel/security update needs a reboot"
  cat /var/run/reboot-required
else
  echo "NO - no reboot needed"
fi
