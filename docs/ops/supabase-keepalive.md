# Supabase Keep-Alive — Ops Guide

## Why This Exists

Supabase free-tier projects are **automatically paused after 7 days of inactivity**.
A paused project returns HTTP 503 until manually unpaused via the Supabase dashboard,
which means the app is completely broken for users until someone notices and clicks the
"Restore" button.

xtrack runs on the Supabase free tier. This keep-alive job pings the project twice
a week so it is never idle long enough to be paused.

## How It Works

A GitHub Actions cron workflow (`.github/workflows/supabase-keepalive.yml`) runs
**every Tuesday and Friday at 08:00 UTC**. It calls `node scripts/supabase-keepalive.mjs`,
which sends a single HTTP GET to the Supabase project URL and exits non-zero if the
project does not respond.

## Required Setup

### GitHub Repository Secret

Before this workflow is effective, you **must** add the following secret to the GitHub
repository:

| Secret name              | Value                                                                      |
|--------------------------|----------------------------------------------------------------------------|
| `SUPABASE_KEEPALIVE_URL` | A public endpoint of your Supabase project, e.g. `https://<ref>.supabase.co/auth/v1/health` |

**To add the secret:**

1. Go to the GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `SUPABASE_KEEPALIVE_URL`
4. Value: your Supabase project's health or REST endpoint URL (see below)

### Recommended URL

Use the Supabase auth health endpoint — it is lightweight and does not require an API key:

```
https://<your-project-ref>.supabase.co/auth/v1/health
```

Replace `<your-project-ref>` with your project reference from the Supabase dashboard
(Project Settings → General → Reference ID).

**Do not commit the URL or any API keys.** The URL is stored only as a GitHub Actions
secret and is injected into the workflow at run time.

## Security Notes

- The `SUPABASE_KEEPALIVE_URL` secret is never printed in logs (GitHub masks secrets)
- No privileged keys (`service_role` or JWT secret) are used or required
- The script only issues an unauthenticated GET — no data is read or written
- Do not add the URL or any Supabase credentials to committed files

## Troubleshooting

### Job fails with "SUPABASE_KEEPALIVE_URL is not set"

The GitHub Actions secret has not been added. Follow the **Required Setup** steps above.

### Job fails with HTTP 5xx

The Supabase project may already be paused or experiencing an outage.

1. Log in to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Find the xtrack project
3. If it shows "Paused" or "Sleeping", click **Restore project**
4. Wait for the project to become active (usually 1–2 minutes)
5. Re-run the GitHub Actions workflow manually to confirm it passes

### Job fails with a timeout or connection error

- Verify the URL in the secret is correct (no trailing characters, correct project ref)
- Check the Supabase status page: [status.supabase.com](https://status.supabase.com)
- Try curling the URL from your local machine to confirm it is reachable

### How to trigger manually

Go to the GitHub repository → **Actions** → **Supabase Keep-Alive** → **Run workflow**.

## Cadence Details

The cron `0 8 * * 2,5` fires at:

| Day       | Time (UTC) |
|-----------|------------|
| Tuesday   | 08:00      |
| Friday    | 08:00      |

This gives a maximum gap of 4 days between pings (Friday to Tuesday), comfortably
below the 7-day inactivity threshold. If the free-tier pause window is reduced in
future, update the cron to run more frequently.
