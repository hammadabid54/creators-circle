#!/bin/bash
# Security step 2: disable password SSH login
set -e

CONF=/etc/ssh/sshd_config

# Idempotent: set PasswordAuthentication no. Don't touch anything else.
# If line exists, replace it; if not, append at the end.
if grep -qE '^[[:space:]]*PasswordAuthentication' "$CONF"; then
  sed -i 's/^[[:space:]]*PasswordAuthentication.*/PasswordAuthentication no/' "$CONF"
  echo "Updated existing PasswordAuthentication line to 'no'"
else
  echo "" >> "$CONF"
  echo "# Kollabo hardening: disable password login (key-only)"
  echo "PasswordAuthentication no" >> "$CONF"
  echo "Appended PasswordAuthentication no to $CONF"
fi

# Validate config syntax before reloading (so we don't get locked out)
echo ""
echo "=== Validating sshd config ==="
sshd -t && echo "OK — config valid" || echo "FAIL — config invalid, NOT reloading"

# Reload sshd (existing connections unaffected; new ones use new config)
echo ""
echo "=== Reloading sshd ==="
systemctl reload sshd
echo "OK"

# Show effective setting
echo ""
echo "=== Effective setting ==="
sshd -T 2>/dev/null | grep -E '^(passwordauthentication|pubkeyauthentication|permitrootlogin)'
