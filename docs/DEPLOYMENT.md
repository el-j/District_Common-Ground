# Deployment — EU production

Launch audit 2026-09-29, Phase 6. This is the checklist for running the game publicly on a single EU server. It covers one small VM; nothing here needs Kubernetes.

## 1. Before the first deploy

- [ ] **Legal pages.** Fill every `[PLACEHOLDER]` in `apps/web/public/privacy.html` and `apps/web/public/imprint.html`: operator, address, contact, hosting provider, and backup/log retention. Have them reviewed. In Germany an incomplete imprint can be served a formal warning (Abmahnung).
- [ ] **License.** Choose one and add `LICENSE`. The README currently says "all rights reserved".
- [ ] **Hosting.** Use an EU region and sign the provider's data processing agreement (Art. 28 GDPR).
- [ ] **Secrets.** Generate them; never reuse the example values:
  ```bash
  openssl rand -base64 48   # JWT_SECRET
  openssl rand -base64 48   # GAME_SESSION_SECRET
  openssl rand -base64 32   # POSTGRES_PASSWORD
  ```
  Set `VITE_ORIGIN=https://<your-domain>`. It is used for CORS and for absolute `og:image`/`og:url` link previews.

## 2. Topology

```
Internet ──443──▶ TLS proxy (Caddy) ──▶ web (nginx :80, published as :9300)
                                            └── /api/ ──▶ api :8080 ──▶ db :5432
```

- Only the TLS proxy is public. Bind the web container to localhost by changing `ports` to `"127.0.0.1:9300:80"`, or firewall it.
- The API trusts `X-Real-IP` (`TRUST_PROXY=true`) because only nginx can reach it. Never publish the API port directly.
- The rate limiter (`apps/api/internal/middleware/ratelimit.go`) is **in memory and per process**. That is correct for one API container. If you run several replicas, move it to a shared store such as Redis or Postgres, or put limits in the proxy.

### TLS with Caddy (automatic Let's Encrypt)

`/etc/caddy/Caddyfile`:

```
play.example.eu {
    encode zstd gzip
    reverse_proxy 127.0.0.1:9300
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
}
```

nginx inside the web container already sends the CSP, `nosniff`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy` headers, plus cache headers (immutable `/assets/`, `no-cache` for HTML, the service worker and `/plugins/`).

## 3. Deploy / update

```bash
git pull
docker compose build
docker compose up -d        # restart: unless-stopped on all services
docker compose ps           # api and web should be "healthy"
```

Database migrations run automatically when the API starts (golang-migrate, `apps/api/internal/db/migrations`). Every migration has a `.down.sql`. To roll back, run the matching down migration before deploying the previous image.

## 4. Backups

The only state is the `pgdata` volume. Take a nightly logical dump and keep copies off the server:

```bash
# /etc/cron.d/dcg-backup
15 3 * * * root docker compose -f /srv/dcg/docker-compose.yml exec -T db \
  pg_dump -U dcg -Fc district_cg | gpg --batch --yes -r backups@example.eu -e \
  > /var/backups/dcg/district_cg-$(date +\%F).dump.gpg && \
  find /var/backups/dcg -name '*.dump.gpg' -mtime +30 -delete
```

- Ship `/var/backups/dcg` to an EU object store (restic, rclone, or the provider's backup service).
- Keep backups no longer than the privacy policy says. Account deletion removes live data at once; backups age out within that retention period.
- **Test a restore** before launch and then quarterly:
  ```bash
  gpg -d district_cg-YYYY-MM-DD.dump.gpg | docker compose exec -T db pg_restore -U dcg -d district_cg --clean --if-exists
  ```

## 5. Monitoring

Minimum viable setup:

- **Uptime.** An external check every minute on `https://<domain>/` (the client) and `https://<domain>/health`, which nginx proxies to the API and which should return `{"status":"ok"}`.
- **Container health.** `docker compose ps` shows the health checks. Alert when a container is unhealthy or restarting (for example with a cron job running `docker compose ps --format json`, or cAdvisor/Prometheus).
- **Logs.** `docker compose logs -f api web`. Set Docker's `json-file` log driver with `max-size`/`max-file` so logs rotate, and keep them only as long as the privacy policy states.
- **Disk.** Alert at 80% on the volume holding `pgdata` and the backups.
- **Errors to watch.** Frequent API `429`s mean the limits are too tight, or someone is abusing the service. `5xx` responses mean something is broken.

## 6. What is intentionally *not* here yet

- **CSP `'unsafe-inline'` scripts.** The sandboxed plugin iframes are built from `srcdoc`/`blob:` documents with an inline bootstrap. Removing it needs a nonce- or hash-based bootstrap.
- **Password reset by email.** There is no mail service yet. Players who forget their password can keep playing offline; their cloud save can't be recovered.
- **Horizontal scaling.** See the note on the rate limiter above.
