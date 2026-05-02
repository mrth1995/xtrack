<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getSessionGate, isStandalone } from '$lib/auth/session';
	import { flushExpenseQueue, installExpenseSyncTriggers } from '$lib/offline/expense-sync';
	import type { LayoutData } from './$types';

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

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
	let sessionReady = $state(false);

	onMount(() => {
		if (!browser) {
			return;
		}

		let cleanup: (() => void) | undefined;

		void (async () => {
			if (!isStandalone()) {
				standalonePending = false;
				sessionReady = true;
			} else {
				const gate = await getSessionGate();

				if (!gate.authenticated) {
					await goto('/auth?session=expired');
					return;
				}

				sessionReady = true;
				standalonePending = false;
			}

			const contextFactory = () => ({
				sessionReady,
				householdId: data.householdId
			});

			cleanup = installExpenseSyncTriggers(contextFactory);
			// The installed triggers listen for online and visibilitychange; app open flushes once here.
			if (data.householdId) {
				void flushExpenseQueue(contextFactory());
			}
		})();

		return () => cleanup?.();
	});
</script>

{#if standalonePending}
	<div class="flex min-h-screen items-center justify-center">
		<p class="text-sm" style="color: var(--color-muted)">Restoring your session...</p>
	</div>
{:else}
	{@render children()}
{/if}
