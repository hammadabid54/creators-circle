#!/usr/bin/env python3
"""Insert/replace GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env safely."""
import sys, re

ENV = '/var/www/kollabo.pk/apps/web/.env'
CLIENT_ID = sys.argv[1]
CLIENT_SECRET = sys.argv[2]

with open(ENV, 'r') as f:
    content = f.read()

def set_value(text, key, value):
    pattern = re.compile(rf'^{re.escape(key)}=".*"$', re.MULTILINE)
    if pattern.search(text):
        return pattern.sub(f'{key}="{value}"', text)
    return text + f'\n{key}="{value}"\n'

content = set_value(content, 'GOOGLE_CLIENT_ID', CLIENT_ID)
content = set_value(content, 'GOOGLE_CLIENT_SECRET', CLIENT_SECRET)

with open(ENV, 'w') as f:
    f.write(content)

# Print confirmation without leaking secrets
print(f'Wrote {len(content)} bytes to {ENV}')
print(f'GOOGLE_CLIENT_ID set: {bool(re.search(r"^GOOGLE_CLIENT_ID=.+", content, re.MULTILINE))}')
print(f'GOOGLE_CLIENT_SECRET set: {bool(re.search(r"^GOOGLE_CLIENT_SECRET=.+", content, re.MULTILINE))}')
