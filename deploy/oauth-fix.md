# Deploy the OAuth callback fix

The application must use `https://kollabo.pk` for both `AUTH_URL` and
`NEXTAUTH_URL`. These values are included in `ecosystem.config.cjs`.
Meta's allowed callback URI must be
`https://kollabo.pk/api/social/meta/callback`.

1. Deploy the changed application files and build with the project's pinned
   pnpm version (`9.15.0`). Run `node qa-oauth.cjs` from `apps/web`.
2. Apply the proxy header and canonical hostname changes from
   `kollabo.pk.nginx.conf` to the **active HTTPS server block**. Preserve the
   existing Certbot TLS directives; do not replace the live configuration with
   the HTTP bootstrap template. Ensure `/api/` inherits the headers; if that
   location already defines any `proxy_set_header`, put the complete header set
   there too. Run `nginx -t` before reloading Nginx.
3. Ensure the production `.env` also has the two public URL values above.
   Reload PM2 using the updated ecosystem file so the new environment takes
   effect: `pm2 startOrReload deploy/ecosystem.config.cjs --update-env` from the
   repository root, then `pm2 save`.
4. Check that `https://www.kollabo.pk` redirects to `https://kollabo.pk` and
   `/api/social/meta/start` never returns a localhost Location header.
5. Sign in on `https://kollabo.pk` and begin a **fresh** Meta connection. Existing
   in-flight attempts use the old state cookie format and must be restarted.
   Complete the Meta login and verify the connected account appears.

The regression test covers concurrent attempts, single-use state, expiry,
canonical start URLs and invalid-state redirects behind an internal proxy.
It does not replace the final authenticated Meta round-trip on production.
