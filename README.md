# xtrack

Mobile-first expense tracker for Indonesian households, built with SvelteKit and Supabase.

## Prerequisites

- Node.js LTS
- `npm`
- A Supabase project

Optional for local database development:

- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
- Docker

## Run The App

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local env file:

   ```bash
   cp .env.example .env
   ```

3. Fill `.env` with real Supabase values:

   ```env
   PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_PROJECT_REF=<your-project-ref>
   ```

   You can find these in Supabase Dashboard:
   - `Settings -> API -> Project URL`
   - `Settings -> API -> anon public key`
   - `Settings -> General -> Reference ID`

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open the app:

   ```text
   http://localhost:5173
   ```

## Local Supabase Option

If you want to run against a local Supabase stack instead of a hosted project:

1. Start Supabase locally:

   ```bash
   supabase start
   ```

2. Apply migrations:

   ```bash
   supabase db push
   ```

3. Update `.env` to point at the local API:

   ```env
   PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   PUBLIC_SUPABASE_ANON_KEY=<local anon key from supabase start>
   SUPABASE_PROJECT_REF=local
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

Local Supabase ports in this repo are defined in [supabase/config.toml](/Users/ridwan.taufik/Projects/personal/xtrack/supabase/config.toml:1).

## Useful Commands

- `npm run dev` - start the app in development mode
- `npm run build` - build the production bundle
- `npm run preview` - preview the production build locally
- `npm run check` - run SvelteKit sync and type checks
- `npm run test:unit` - run unit tests

## Troubleshooting

### `getaddrinfo ENOTFOUND placeholder.supabase.co`

Your app is still pointing at a placeholder Supabase URL. Fix `.env` so `PUBLIC_SUPABASE_URL` contains a real project URL, then restart `npm run dev`.

### Confirmation email opens `http://localhost:3000`

Your hosted Supabase project is still using the default Auth Site URL.

Fix both of these in Supabase Dashboard:

- `Authentication -> URL Configuration -> Site URL`
- `Authentication -> URL Configuration -> Redirect URLs`

For local dev, add your actual app URL, for example:

- `http://127.0.0.1:5173/auth`
- `http://localhost:5173/auth`

### `fetch failed` on startup

Usually this means one of these is true:

- `PUBLIC_SUPABASE_URL` is wrong
- `PUBLIC_SUPABASE_ANON_KEY` is missing or invalid
- your Supabase project is paused or unreachable

### `supabase db push` does not work

Make sure the Supabase CLI is installed and authenticated first. If you only want to run the frontend against a hosted Supabase project, you can skip local CLI usage and just set the hosted values in `.env`.

## Related Docs

- Environment template: [.env.example](/Users/ridwan.taufik/Projects/personal/xtrack/.env.example:1)
- Keep-alive workflow setup: [docs/ops/supabase-keepalive.md](/Users/ridwan.taufik/Projects/personal/xtrack/docs/ops/supabase-keepalive.md:1)
