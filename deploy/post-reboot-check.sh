#!/bin/bash
echo "=== SSH security ==="
echo "passwordauthentication: $(sshd -T 2>/dev/null | grep '^passwordauthentication' | awk '{print $2}')"

echo ""
echo "=== PM2 processes ==="
pm2 list 2>&1 | head -10
echo "pm2 startup: $(systemctl is-enabled pm2-root 2>/dev/null || echo "not enabled via pm2-root")"

echo ""
echo "=== Site reachable ==="
for path in / /creators /signin /privacy /terms; do
  status=$(curl -s -o /dev/null -w "%{http_code}" --resolve kollabo.pk:443:127.0.0.1 https://kollabo.pk${path})
  echo "  ${path}: ${status}"
done

echo ""
echo "=== Postgres ping ==="
sudo -u postgres psql -tAc "SELECT 1" 2>&1

echo ""
echo "=== Reboot-required flag ==="
if [ -f /var/run/reboot-required ]; then
  echo "still present:"
  cat /var/run/reboot-required
else
  echo "cleared (good)"
fi

echo ""
echo "=== Pending updates (was 42 before upgrade) ==="
echo "now: $(apt list --upgradable 2>/dev/null | wc -l)"

echo ""
echo "=== Port bind check ==="
ss -tlnp 2>/dev/null | grep -E ":(22|80|443|3001|5432)" | head -10
