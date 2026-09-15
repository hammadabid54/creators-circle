#!/bin/bash
# Bring PM2 apps back online after reboot, and wire systemd so it survives future reboots.
set -e

echo "=== Step 1: start Kollabo (was running before reboot) ==="
cd /var/www/kollabo.pk/deploy
pm2 start ecosystem.config.cjs 2>&1 | tail -3

echo ""
echo "=== Step 2: start Omni Path ==="
cd /var/www/omnipathmarketing.com
if [ -f ecosystem.config.cjs ]; then
  pm2 start ecosystem.config.cjs 2>&1 | tail -3
else
  # Omni Path was started ad-hoc; replicate the same command
  pm2 start "node node_modules/next/dist/bin/next" --name "omni-path-marketing" -- start -p 3000 2>&1 | tail -3
fi

echo ""
echo "=== Step 3: save the running process list ==="
pm2 save 2>&1 | tail -2

echo ""
echo "=== Step 4: generate systemd unit so PM2 + apps survive future reboots ==="
pm2 startup 2>&1 | grep -E "systemctl|sudo" | tail -3

echo ""
echo "=== Step 5: status ==="
sleep 3
pm2 list | head -10
