#!/bin/bash
echo "=== sshd_config.d files ==="
ls -la /etc/ssh/sshd_config.d/
echo ""
echo "=== 50-cloud-init.conf content ==="
cat /etc/ssh/sshd_config.d/50-cloud-init.conf 2>/dev/null
echo ""
echo "=== Last 20 lines of main config ==="
tail -20 /etc/ssh/sshd_config
echo ""
echo "=== After restart, check effective setting ==="
systemctl restart ssh
sleep 2
echo "passwordauthentication: $(sshd -T 2>/dev/null | grep '^passwordauthentication' | awk '{print $1, $2}')"
echo "pubkeyauthentication: $(sshd -T 2>/dev/null | grep '^pubkeyauthentication' | awk '{print $1, $2}')"
echo ""
echo "=== Is sshd actually reloading? ==="
echo "sshd_config test: $(sshd -t 2>&1)"
