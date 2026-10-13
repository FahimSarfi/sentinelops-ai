# Production and continuous development

SentinelOps is a personal portfolio project under active development. The web image is prepared for self-hosting; the incident backend remains local-only. This is a deployment foundation, not a completed production security review.

## Delivery workflow

1. Work in a feature branch; open a pull request.
2. CI checks Python tests, frontend formatting and types, and browser/accessibility flows.
3. Merge reviewed, passing changes to main.
4. The Publish web image workflow builds an immutable commit-tagged container after successful main CI when repository variables are configured. It can also be run manually.
5. Pull that exact image tag onto your server, verify its health, and retain the previous tag for rollback. Automatic server rollout is not enabled until the server, domain, SSH identity, and protected deployment environment are configured.

Recommended repository protection: require CI backend/frontend checks and reviewed pull requests; disallow force pushes to main. These settings have not been changed automatically.

## Web container on your server

Create deploy/.env privately with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and NEXT_PUBLIC_SITE_URL=https://your-domain. Only public client settings belong in build arguments. Never put a service-role/secret key, OAuth client secret, database password or model key there. The frontend already uses public Supabase settings; no secret key is needed for its account flows.

Build and start from the repository root:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yml build
docker compose --env-file deploy/.env -f deploy/compose.yml up -d --wait
docker compose --env-file deploy/.env -f deploy/compose.yml logs --tail=100 web
```

The web port binds to 127.0.0.1:3000. Put your HTTPS reverse proxy in front of it; configure Supabase site/redirect URLs for the same domain. Public variables are embedded at build time: rebuild when they change. The non-root container has a read-only filesystem with a writable ephemeral cache, restart policy and health check. No backend API is published by this compose file. It does not include a model/database worker.

For published images, replace the compose image with ghcr.io/mohammadfahimhaque/sentinelops-ai-web:<commit-sha> and omit the build step. Pin an exact tested SHA. Keep the previous image available and switch back if validation fails. Do not run compose down -v against persistent services.

## Before public incident execution

- Enforce validated user identity and workspace ownership on every backend operation and report read.
- Add request limits, durable jobs, idempotent decisions, audit records, and least-privilege database connections.
- Migrate incident state from the single-worker SQLite store to durable shared storage with reviewed migrations.
- Keep repair operations allowlisted and require explicit, scoped human approval.
- Add integration tests that prove isolation between two workspaces, authorization denials, retries and rollback.
- Validate live model calls and actual account sign-in; passing sample tests alone is insufficient.
- Add TLS, monitoring, alerting, encrypted backups, restore drills, and a staging environment before production rollout.

## CI/CD configuration

Repository variables for the image workflow: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SITE_URL. Publishable keys are public; no privileged Supabase key is accepted by the build.

The image job uses the built-in GitHub token with package-write permission. For server deployment later, store SSH credentials as protected environment secrets, require approval for production, and verify the server host key. Do not add credentials to Git.

The first priority after this backup is backend authorization and tenant isolation. Next: durable jobs and migrations, staging deployment, then a controlled server release. Keep design/feature improvements in small PRs with appropriate tests.
