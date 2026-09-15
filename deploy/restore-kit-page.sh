#!/usr/bin/env bash
set -euo pipefail
cd "C:\Users\hamma\OneDrive\Documents\Creators Pakistan"
git show "9d198c2:apps/web/app/kit/[slug]/page.tsx" > "apps/web/app/kit/[slug]/page.tsx"
echo "Restored. File contents (first 30 lines):"
head -30 "apps/web/app/kit/[slug]/page.tsx"
