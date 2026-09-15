#!/usr/bin/env bash
# Final security verification snapshot.
set +e

echo "=== 1. SSH password login (must be no) ==="
sshd -T 2>/dev/null | grep -iE "^passwordauthentication"

echo
echo "=== 2. fail2ban jail ==="
fail2ban-client status sshd

echo
echo "=== 3. unattended-upgrades ==="
apt-config dump 2>/dev/null | grep -iE "unattended-upgrades" | head -5

echo
echo "=== 4. PM2 systemd + processes ==="
systemctl is-enabled pm2-root 2>&1
pm2 list

echo
echo "=== 5. Port 3001 binding (must be 127.0.0.1 only) ==="
ss -tlnp 2>/dev/null | grep -E ":3001|:3000"

echo
echo "=== 6. Backups ==="
ls -lh /var/backups/kollabo/

echo
echo "=== 7. Crontab ==="
crontab -l

echo
echo "=== 8. Kernel + uptime (reboot evidence) ==="
uname -r
uptime
