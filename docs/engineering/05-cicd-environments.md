# OSVANT — CI/CD & Environments

> **Eng doc 5 of 9.** Pipeline, environments, secrets, release/rollback.

## 1. Environments

| Env | URL | Source | Purpose |
|---|---|---|---|
| Preview | `staging.osvant.com/previews/pr-<n>/` | every PR | review target: motion QA, LHCI, stakeholder links |
| Staging | `staging.osvant.com` | `main`, auto | pre-prod verification on real CDN |
| Production | `osvant.com` | `main`, promoted manually | live site |

- Infra (ADR-011): staging + prod S3 buckets, each behind CloudFront (OAC, brotli, HTTP/2+3, response-headers policy). Previews live under the staging distro at `previews/pr-<n>/` (Astro `base` set per deploy).
- Staging auto-deploys on merge; production is a **manual promote** of the same retained artifact — no direct-to-prod builds.
- Config: `PUBLIC_SITE_URL` per env; AWS auth via GitHub OIDC role — no long-lived keys. `.env.example` documents all (a static build holds no secrets).

## 2. CI pipeline (GitHub Actions, every PR)

```
install → lint + stylelint + tsc ──┐
        → vitest (unit)            ├─ parallel
        → astro build              ┘
→ check:guardrails (no box-shadow / uppercase / neutral gray in dist, ADR-017)
→ check:copy + check:glyphs + check:responsive
→ deploy preview (S3 `previews/pr-<n>/` + CloudFront invalidation; link commented on PR)
→ playwright smoke (against preview)
→ lighthouse CI + size-limit — JS ≤ 350KB gzip, CSS ≤ 40KB gzip (ADR-019)
→ report: budgets table + preview link as PR comment
```

- Nightly (main): full Playwright suite + axe scan + full LHCI on all routes (`04 §2`).
- Guardrail step: parses declarations rather than matching strings — `box-shadow` appears legitimately inside `transition-property`, and Lightning CSS minifies an authored `transparent` to `#0000`, which is neutral by channel and paints nothing (ADR-017).
- Asset guard step: fails on any `.glb`/`.gltf`/`.hdr` or anything under `assets/video/` (withdrawn by ADR-013), any raster image not AVIF, any bottle still > 180KB, any font not woff2 (`06-asset-pipeline.md`).

## 3. Content updates

Git-driven only (ADR-009/010): journal markdown or `products.json` change = normal PR → merge → staging → promote. No webhooks, no external rebuild triggers.

## 4. Release & rollback

- Release = Actions `deploy-prod` job (manual approval via GitHub environment) syncs the staging-verified artifact to the prod bucket + targeted invalidation; tag `vX.Y.Z` + changelog from conventional commits.
- Rollback = re-run `deploy-prod` with the previous retained artifact (build artifacts kept 90 days) — static site, zero migration risk. Owner: whoever promoted.
- Launch freeze: no merges to `main` launch-day −1 except `fix:` with head-of-eng approval.

## 5. Monitoring & ops (post-launch)

- **Field CWV:** CrUX/PageSpeed snapshots monthly (no RUM script, ADR-012); CloudWatch RUM optional later.
- **Errors:** none by default (zero third-party); Sentry documented as opt-in seam (`07 §6`).
- **Uptime:** external ping on `/` + `/collection/volt` every 5 min.
- **Domains/DNS:** DNS → CloudFront, ACM cert (us-east-1), `www` → apex redirect at the edge, HSTS on.
- **Headers** (CloudFront response-headers policy): CSP `default-src 'self'` — nothing external to allowlist; immutable cache on hashed assets, `no-cache` on HTML; `Referrer-Policy` + `X-Content-Type-Options` set.

## 6. Access & ownership

| System | Owner | Engineering access |
|---|---|---|
| GitHub (repo, Actions, environments) | owner | admin |
| AWS (S3, CloudFront, ACM, OIDC deploy role) | owner | scoped deploy role via OIDC |
