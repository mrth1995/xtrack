# Quick Task 260425-wge Plan

**Date:** 2026-04-25
**Description:** fix auth code callback so /auth?code=... exchanges for a session instead of rendering the login form

## Goal

Make the SSR auth callback path complete the Supabase PKCE code exchange on `/auth?code=...` and redirect authenticated users into the app instead of leaving them on the login screen.

## Tasks

### 1. Handle PKCE callbacks on the server
- Update `/auth` page server load to detect `?code=...`.
- Exchange the auth code for a session with the SSR Supabase client.
- Redirect successful exchanges into `/`.

### 2. Cover the route behavior with tests
- Add a focused unit test for `/auth?code=...`.
- Verify authenticated and unauthenticated non-callback behavior still works.

### 3. Verify the fix
- Run the new auth route test.
- Run Svelte type checks.

