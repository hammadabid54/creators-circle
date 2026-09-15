#!/bin/bash
# Security step 2b: fix cloud-init override
set -e

DROP_IN=/etc/ssh/sshd_config.d/50-cloud-init.conf
echo "=== Before ==="
cat "$DROP_IN"

# Replace the value to match our hardening
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' "$DROP_IN"

echo ""
echo "=== After ==="
cat "$DROP_IN"

echo ""
echo "=== Validate ==="
sshd -t && echo "OK — config valid"

echo ""
echo "=== Restart sshd ==="
systemctl restart ssh
sleep 1

echo ""
echo "=== Effective ==="
echo "passwordauthentication: $(sshd -T 2>/dev/null | grep '^passwordauthentication' | awk '{print $2}')"
echo "pubkeyauthentication:    $(sshd -T 2>/dev/null | grep '^pubkeyauthentication' | awk '{print $2}')"
