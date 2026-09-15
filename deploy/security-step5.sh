#!/bin/bash
# Security step 5: install + configure fail2ban for SSH brute-force protection.
# Note: with PasswordAuthentication no, fail2ban is a layer of depth, not the
# primary defense. Still useful — bans clients that probe the port.
set -e

export DEBIAN_FRONTEND=noninteractive

echo "=== Install fail2ban ==="
apt-get install -y -qq fail2ban 2>&1 | tail -3

echo ""
echo "=== Write /etc/fail2ban/jail.local (overrides defaults; we don't touch jail.conf) ==="
cat > /etc/fail2ban/jail.local <<'EOF'
# Kollabo fail2ban config — overrides defaults
[DEFAULT]
# Ban for 1 hour
bantime  = 1h
# Look at the last 10 minutes of attempts
findtime = 10m
# 5 failed attempts = banned
maxretry = 5
# Ignore our own SSH key retries (so a user retyping a key doesn't self-ban)
ignoreip = 127.0.0.1/8

# Use systemd backend (Ubuntu 24.04 default)
backend = systemd

# Sendmail not needed; fail2ban just bans via iptables/nftables
mta = sendmail

# Default action: ban only (no email)
banaction = nftables-multiport
banaction_allports = nftables-allports

[sshd]
enabled = true
port    = ssh
filter  = sshd
backend = systemd
logpath = /var/log/auth.log
maxretry = 5
findtime = 10m
bantime  = 1h

[nginx-http-auth]
enabled = false
EOF

echo "wrote /etc/fail2ban/jail.local"

echo ""
echo "=== Enable + start fail2ban ==="
systemctl enable fail2ban
systemctl restart fail2ban
sleep 2

echo ""
echo "=== Status ==="
fail2ban-client status 2>&1 | head -15

echo ""
echo "=== Verify sshd jail is active ==="
fail2ban-client status sshd 2>&1 | head -10
