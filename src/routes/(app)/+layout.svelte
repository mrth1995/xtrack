<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getSessionGate, isStandalone } from '$lib/auth/session';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	/**
	 * In standalone (Home Screen) mode, Safari and the installed-app context
	 * are isolated. A session established in Safari is not automatically
	 * available in the PWA context. We gate the signed-in shell on a session
	 * restoration attempt so unauthenticated first-opens are caught client-side
	 * before any protected content renders.
	 *
	 * In regular browser mode the server-side guard (hooks.server.ts +
	 * (app)/+layout.server.ts) is authoritative; we skip the client gate to
	 * avoid a redundant round-trip.
	 */
	let standalonePending = $state(browser && isStandalone());

	onMount(async () => {
		if (!browser || !isStandalone()) {
			standalonePending = false;
			return;
		}

		const gate = await getSessionGate();

		if (!gate.authenticated) {
			await goto('/auth?session=expired');
			return;
		}

		standalonePending = false;
	});
</script>

{#if standalonePending}
	<div class="flex min-h-screen items-center justify-center">
		<p class="text-sm" style="color: var(--color-muted)">Restoring your session...</p>
	</div>
{:else}
	{@render children()}
{/if}
