#!/usr/bin/env node
/**
 * Supabase Keep-Alive Script
 *
 * Sends a lightweight HTTP request to the Supabase project to prevent
 * free-tier inactivity pause (triggered after 7 days of no activity).
 *
 * Usage: node scripts/supabase-keepalive.mjs
 *
 * Required environment variable:
 *   SUPABASE_KEEPALIVE_URL — The URL to ping (e.g. your Supabase REST API
 *                            health endpoint or a lightweight public endpoint).
 *                            Set this as a GitHub Actions secret.
 *
 * Example URL (Supabase REST health check):
 *   https://<project-ref>.supabase.co/rest/v1/
 *   or
 *   https://<project-ref>.supabase.co/auth/v1/health
 *
 * The script exits with code 1 on failure so GitHub Actions marks the job
 * as failed and you get an email notification.
 */

const url = process.env.SUPABASE_KEEPALIVE_URL;

if (!url) {
  console.error(
    "[keepalive] ERROR: SUPABASE_KEEPALIVE_URL environment variable is not set."
  );
  console.error(
    "[keepalive] Add this secret to your GitHub repository settings."
  );
  process.exit(1);
}

console.log(`[keepalive] Pinging Supabase at: ${new URL(url).origin}`);

try {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "xtrack-keepalive/1.0",
    },
    // Timeout after 15 seconds to avoid hanging the CI job
    signal: AbortSignal.timeout(15_000),
  });

  if (response.ok || response.status === 400) {
    // 400 is acceptable for the REST endpoint without an apikey header —
    // the server responded, which is all we need to confirm the project is live.
    console.log(
      `[keepalive] SUCCESS — Supabase responded with HTTP ${response.status}`
    );
    process.exit(0);
  }

  // 5xx errors indicate the project may actually be down or paused
  if (response.status >= 500) {
    console.error(
      `[keepalive] ERROR — Supabase returned HTTP ${response.status}. Project may be paused.`
    );
    console.error(
      "[keepalive] Check the Supabase dashboard: https://supabase.com/dashboard"
    );
    process.exit(1);
  }

  // Any other non-2xx is unexpected but the project is responsive
  console.log(
    `[keepalive] OK — Supabase responded with HTTP ${response.status} (treated as alive)`
  );
  process.exit(0);
} catch (error) {
  if (error.name === "TimeoutError") {
    console.error("[keepalive] ERROR — Request timed out after 15 seconds.");
  } else {
    console.error(`[keepalive] ERROR — ${error.message}`);
  }
  console.error(
    "[keepalive] Check network access or verify SUPABASE_KEEPALIVE_URL is correct."
  );
  process.exit(1);
}
