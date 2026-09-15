$ErrorActionPreference = 'Stop'
Set-Location "C:\Users\hamma\OneDrive\Documents\Creators Pakistan"

$files = @(
    # Postgres migration fixes
    'apps/web/lib/creator-metrics.ts',
    'apps/web/lib/creator-ranking.ts',
    'apps/web/lib/discovery-search.ts',
    'apps/web/lib/discovery-taxonomy.ts',
    'apps/web/app/admin/discovery/page.tsx',
    'apps/web/app/api/account/email/route.ts',
    # Legal
    'apps/web/components/landing/site-footer.tsx',
    "apps/web/app/(auth)/signin/page.tsx",
    'apps/web/app/privacy/page.tsx',
    'apps/web/app/terms/page.tsx',
    # Google OAuth
    'apps/web/lib/auth.ts',
    'apps/web/lib/login-identity.ts',
    # Path B social sync
    'apps/web/app/api/social/sync/route.ts',
    'apps/web/lib/sync-social.ts',
    'apps/web/lib/meta-metrics.ts',
    'apps/web/lib/tiktok-metrics.ts',
    'apps/web/app/api/cron/sync-social/route.ts',
    # Misc UI fix
    'apps/web/components/contracts/milestone-actions.tsx',
    # Deploy + ops
    'deploy/ecosystem.config.cjs',
    'deploy/cron-sync.sh',
    'deploy/kollabo.pk.nginx.conf',
    'deploy/postgres-backup.sh',
    'deploy/postgres-backup-install.sh',
    'deploy/set-google-creds.py',
    'deploy/verify-security.sh',
    'deploy/security-audit.sh',
    'deploy/security-step1.sh',
    'deploy/security-step2.sh',
    'deploy/security-step2b.sh',
    'deploy/security-step5.sh',
    'deploy/post-reboot-check.sh',
    'deploy/post-reboot-start.sh',
    'deploy/debug-ssh.sh',
    'deploy/fix-boolean-comparisons.py',
    'deploy/inspect-chunk.py',
    'deploy/quote-columns.py',
    'deploy/quote-tables.py',
    'docs/build-log/kollabo-review.md'
)

& python scripts/check_eol.py @files
