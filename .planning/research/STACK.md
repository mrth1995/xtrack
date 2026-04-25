# Technology Stack

**Project:** xtrack — iOS-first PWA expense tracker for Indonesian households
**Researched:** 2026-04-25
**Overall confidence:** HIGH (all core claims verified against official docs, npm, or authoritative 2026 sources)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SvelteKit | 2.58.x | Full-stack web framework, routing, SSR/SSG | Compiler-based: ~85 KB gzipped bundle vs Next.js ~240 KB for the same CRUD app. Smaller bundles matter on mobile Safari. Svelte 5 runes are stable and ergonomic for a solo developer. No React overhead. |
| Svelte | 5.55.x | UI component language | Stable as of October 2024. Runes (`$state`, `$derived`, `$effect`) are the modern API — use these from day one, not the legacy stores. |
| TypeScript | 5.x (bundled) | Type safety | First-class in SvelteKit 2. No extra config needed. |
| Tailwind CSS | 4.x | Utility-first styling | Vite-native in v4 (`@tailwindcss/vite`), no PostCSS config, 100x faster incremental builds. Official SvelteKit scaffolding already ships with v4. |

### PWA Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vite-plugin-pwa | 1.2.x | Service worker generation, web app manifest, Workbox caching | Zero-config integration for SvelteKit. From v0.3.0 supports SvelteKit 2. Uses Workbox under the hood for cache strategies. Actively maintained and the ecosystem standard for Vite-based PWAs. |

### Backend / Auth / Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | Free tier (hosted) | PostgreSQL DB, auth (email + OAuth), realtime subscriptions, file storage (receipts) | Free tier: 500 MB DB, 1 GB file storage, 50,000 MAU, 5 GB egress, unlimited API calls. Two-user household is nowhere near any limit. Postgres gives a real relational model for household isolation from day one. Realtime Postgres changes subscriptions handle the shared expense stream without a polling loop. Row-level security (RLS) enforces household data isolation at the DB layer. |
| @supabase/supabase-js | 2.103.x | Supabase client SDK | Current stable. Isomorphic: works in browser and SvelteKit server hooks. |

### Receipt Scanning (OCR / AI)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Gemini 1.5 Flash (Google AI API) | free tier | Multimodal LLM: parse receipt image → extract amount + category | 1,500 free requests/day, 15 RPM. More than enough for a household. Accepts images directly. For a household-scale app the daily budget is effectively unlimited. Maintained through December 2025 API changes at free tier. |

### Hosting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloudflare Pages | free tier | Static/edge hosting with `@sveltejs/adapter-cloudflare` | Unlimited bandwidth on free tier (Vercel caps at 100 GB/month). No commercial-use prohibition (Vercel Hobby explicitly bans commercial use). First-class SvelteKit support via `@sveltejs/adapter-cloudflare`. Global CDN edge performance. 500 builds/month free. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/svelte-query | 5.x | Server state, optimistic updates, background sync | Wrap Supabase calls. Provides offline-tolerant mutations via `networkMode: 'offlineFirst'` and `IndexedDB` persister. |
| @tanstack/svelte-query-persist-client + idb-keyval | latest | Persist query cache to IndexedDB across sessions | Enables offline-tolerant reads: data survives reload even without network. Critical for mobile PWA resilience. |
| zod | 3.x | Runtime validation | Validate receipt parse results from Gemini before trusting them. Validate form inputs. |
| date-fns | 3.x | Date arithmetic | Payday cycle calculation (current cycle start/end from a day-of-month). Lightweight and tree-shakeable. |
| @sveltejs/adapter-cloudflare | latest | Build adapter | Required for Cloudflare Pages + Workers deployment. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend framework | SvelteKit 2 + Svelte 5 | Next.js 16 | Next.js bundles ~240 KB vs SvelteKit ~85 KB gzipped for equivalent apps. React overhead is real on low-end Android. Vercel's free tier bans commercial use. No meaningful advantage for a solo developer who doesn't already know React. |
| Backend | Supabase (free hosted) | Firebase (Blaze plan) | Firebase removed Cloud Storage from its free Spark plan in February 2026 — any project requiring file uploads (receipt photos) must upgrade to the pay-as-you-go Blaze plan, eliminating the zero-cost guarantee. Firebase's document model also requires more schema design discipline to enforce household isolation. |
| Backend | Supabase (free hosted) | PocketBase (self-hosted) | PocketBase requires a VPS (minimum ~$5/month) to run. Running cost is non-zero. Single-binary SQLite has no managed backup, no horizontal scaling, and no Postgres ecosystem. For a solo developer who wants to focus on product code, managed Supabase is lower operational burden. |
| Hosting | Cloudflare Pages | Vercel Hobby | Vercel Hobby plan explicitly prohibits commercial use. Even a personal app that you later share publicly creates risk of suspension. Unlimited bandwidth on Cloudflare Pages vs 100 GB cap on Vercel. |
| Hosting | Cloudflare Pages | Netlify | Netlify's free tier moved to a 300-credit/month model and reduced build minutes. Less generous than Cloudflare Pages. Cloudflare's edge CDN performance is measurably faster. |
| OCR | Gemini 1.5 Flash (free) | Dedicated receipt OCR APIs (Tabscanner, Mindee) | Tabscanner free plan is 200 credits/month — too low. Mindee is 14-day trial only. Gemini 1.5 Flash handles multimodal image input directly via a single API call, gives 1,500 free requests/day, and produces structured JSON output with a prompt. No separate OCR pipeline needed. |
| PWA plugin | vite-plugin-pwa | @serwist/next | @serwist/next is the recommended path for Next.js users. For SvelteKit, vite-plugin-pwa is the correct choice — it integrates with Vite directly and has first-class SvelteKit documentation. |
| Styling | Tailwind CSS v4 | shadcn-svelte | shadcn-svelte is a component collection (not a CSS framework) built on top of Tailwind. Use Tailwind v4 as the base; pull in shadcn-svelte components only if you need prebuilt accessible primitives (dialog, select, etc). Not a vs — they compose. |

---

## iOS PWA Specific Notes

These are hard constraints imposed by Safari on iOS, not framework choices. They apply regardless of SvelteKit vs Next.js.

### What Works on iOS Safari (as of 2026)

- Service workers run and can cache assets and API responses
- Web App Manifest is supported: `display: standalone` gives full-screen mode
- IndexedDB works for local persistence (use for offline expense queue)
- Push notifications work on iOS 16.4+ outside the EU (requires user permission via `PushManager`)
- "Add to Home Screen" installs the PWA and respects the manifest icons/name/splash

### What Does NOT Work on iOS Safari

- `beforeinstallprompt` event — iOS Safari never fires this. You cannot programmatically trigger the install dialog. You must guide users manually with a custom UI ("tap Share → Add to Home Screen").
- Background Sync API — not supported. Deferred/queued mutations must fire on next foreground open.
- Web Share Target API — not supported. Cannot register the PWA as a share target for photos from the Camera Roll.
- Periodic Background Sync — not supported.

### Storage Gotchas on iOS

- Cache API storage quota: approximately 50 MB reported limit. Do not cache large receipt images in the service worker cache. Store receipt image URLs (Supabase Storage CDN links), not blobs.
- iOS clears PWA storage (Cache + IndexedDB) if the app is unused for ~7 days in some configurations. Implement a "restore from server on first load" strategy via TanStack Query's stale-while-revalidate pattern so a returning user sees data immediately after a cache eviction.
- Clearing Safari history also clears PWA caches. This is a known WebKit behavior (Bug 190269). App data in IndexedDB is slightly more durable than Cache API, but not immune.
- Avoid relying on `localStorage` beyond UI preferences. Use IndexedDB for the offline expense queue.

### Install UX Recommendation

Since `beforeinstallprompt` does not fire on iOS, implement a custom install banner that appears after first meaningful interaction. Detect `navigator.standalone === false` to know the user is in Safari and has not yet installed. Show a bottom sheet: "Add xtrack to your Home Screen for the best experience" with illustrated steps.

### Service Worker Strategy

Use `vite-plugin-pwa` with the `generateSW` strategy (Workbox-generated) for app shell caching. For API data, do NOT put Supabase Realtime websocket traffic through the service worker — handle it in-app only. Cache static assets (fonts, icons, app shell) aggressively. Cache API responses with a `stale-while-revalidate` strategy for non-realtime reads (category list, expense history).

---

## Version Reference

All versions verified against npm and official sources as of 2026-04-25.

| Package | Version | Source |
|---------|---------|--------|
| svelte | 5.55.4 | [npmjs.com/package/svelte](https://www.npmjs.com/package/svelte) |
| @sveltejs/kit | 2.58.0 | [npmjs.com/package/@sveltejs/kit](https://www.npmjs.com/package/@sveltejs/kit) |
| @supabase/supabase-js | 2.103.3 | [npmjs.com/package/@supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js) |
| vite-plugin-pwa | 1.2.0 | [npmjs.com/package/vite-plugin-pwa](https://www.npmjs.com/package/vite-plugin-pwa) |
| tailwindcss | 4.x | [tailwindcss.com/docs/guides/sveltekit](https://tailwindcss.com/docs/guides/sveltekit) |
| @sveltejs/adapter-cloudflare | latest | [npmjs.com/package/@sveltejs/adapter-cloudflare](https://www.npmjs.com/package/@sveltejs/adapter-cloudflare) |

---

## What NOT to Use

| Technology | Reason |
|------------|--------|
| **Firebase (Spark plan)** | Cloud Storage removed from free tier February 3, 2026. Receipt photo upload requires Blaze (pay-as-you-go) plan. Non-zero cost risk for a "zero budget" constraint. |
| **Vercel Hobby plan** | Explicitly prohibits commercial use in Terms of Service. Risk of project suspension if the app is ever shared publicly, which is an explicit future goal in PROJECT.md. |
| **PocketBase** | Requires self-hosted VPS. Non-zero running cost. No managed cloud option. |
| **@ducanh2912/next-pwa** | Last published 2 years ago. Package authors recommend migrating to `@serwist/next`. Not relevant for SvelteKit anyway. |
| **next-pwa (shadowwalker)** | Unmaintained. |
| **Firestore** | NoSQL document model complicates household-scoped relational queries vs Supabase's Postgres + RLS. |
| **React / Next.js** | Higher bundle weight (~240 KB vs ~85 KB) for identical CRUD functionality. No Vercel free-tier commercial use. No advantage for a solo Svelte-capable developer. |
| **Web Share Target API for receipt import** | Not supported on iOS Safari. Receipt scan must use in-app camera capture (`<input type="file" accept="image/*" capture="environment">`). |
| **Background Sync API** | Not supported on iOS Safari. Offline expense queue must flush on foreground resume, not in background. |
| **Paid OCR APIs (Mindee, Tabscanner paid tiers)** | Violates zero-budget constraint. Gemini 1.5 Flash free tier (1,500 req/day) covers household-scale receipt scanning. |

---

## Installation

```bash
# Scaffold
npm create svelte@latest xtrack
# Choose: SvelteKit skeleton app, TypeScript, ESLint, Prettier

# Add Tailwind CSS v4
npx svelte-add@latest tailwindcss

# Core dependencies
npm install @supabase/supabase-js @tanstack/svelte-query @tanstack/svelte-query-persist-client idb-keyval zod date-fns

# PWA
npm install -D vite-plugin-pwa

# Cloudflare adapter
npm install -D @sveltejs/adapter-cloudflare

# TanStack Query dev tools (dev only)
npm install -D @tanstack/svelte-query-devtools
```

---

## Sources

- [SvelteKit vs Next.js in 2026 — DEV Community](https://dev.to/paulthedev/sveltekit-vs-nextjs-in-2026-why-the-underdog-is-winning-a-developers-deep-dive-155b)
- [SvelteKit 2.58.0 on npm](https://www.npmjs.com/package/@sveltejs/kit)
- [Svelte 5.55.4 on npm](https://www.npmjs.com/package/svelte)
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa)
- [vite-plugin-pwa 1.2.0 on npm](https://www.npmjs.com/package/vite-plugin-pwa)
- [SvelteKit PWA docs — vite-pwa-org](https://vite-pwa-org.netlify.app/frameworks/sveltekit)
- [@sveltejs/adapter-cloudflare on npm](https://www.npmjs.com/package/@sveltejs/adapter-cloudflare)
- [Cloudflare Pages SvelteKit guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-svelte-kit-site/)
- [Supabase pricing 2026](https://supabase.com/pricing)
- [@supabase/supabase-js 2.103.3 on npm](https://www.npmjs.com/package/@supabase/supabase-js)
- [Firebase Cloud Storage removed from Spark plan — Firebase docs](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- [Vercel Hobby plan docs](https://vercel.com/docs/plans/hobby)
- [PWA iOS Limitations and Safari Support 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Do Progressive Web Apps Work on iOS? 2026 — MobiLoud](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- [Gemini API pricing 2026 — Google AI](https://ai.google.dev/gemini-api/docs/pricing)
- [Hosting free tier comparison 2026 — agentdeals.dev](https://agentdeals.dev/hosting-free-tier-comparison-2026)
- [Tailwind CSS SvelteKit install guide](https://tailwindcss.com/docs/guides/sveltekit)
- [TanStack Query offline mode discussion](https://github.com/TanStack/query/discussions/9585)
