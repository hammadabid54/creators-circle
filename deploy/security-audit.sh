#!/bin/bash
# Security audit script for Kollabo VPS
echo "=== sshd effective settings ==="
sshd -T 2>/dev/null | grep -iE "^(permitrootlogin|passwordauthentication|pubkeyauthentication|challengeresponse|kbdinteractive)" | head -10

echo ""
echo "=== UFW firewall status ==="
ufw status 2>&1 | head -5

echo ""
echo "=== iptables rules count ==="
iptables -L -n 2>/dev/null | wc -l

echo ""
echo "=== Listening ports ==="
ss -tlnp 2>/dev/null

echo ""
echo "=== Fail2ban installed? ==="
which fail2ban 2>/dev/null || echo "not installed"

echo ""
echo "=== Postgres external exposure ==="
grep -E "^listen_addresses|^port" /etc/postgresql/16/main/postgresql.conf 2>/dev/null | grep -v "^#" | head -5

echo ""
echo "=== OS security updates pending ==="
apt list --upgradable 2>/dev/null | wc -l

echo ""
echo "=== Last 10 SSH login attempts (auth log) ==="
tail -10 /var/log/auth.log 2>/dev/null
