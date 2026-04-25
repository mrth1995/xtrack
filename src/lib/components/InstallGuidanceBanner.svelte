<script lang="ts">
	/**
	 * InstallGuidanceBanner
	 *
	 * Non-modal banner shown only after auth in Safari, never in standalone mode.
	 * Copy is locked per D-38: "Tap Share, then Add to Home Screen".
	 * Dismissal snoozes rather than permanently hiding (D-36 / D-37).
	 */
	import { onMount } from 'svelte';
	import {
		shouldShowInstallGuidance,
		snoozeInstallGuidance
	} from '$lib/install/visibility';

	let visible = $state(false);

	onMount(() => {
		// We always have an authenticated user in the (app) shell, so pass true.
		// The visibility helper reads navigator.standalone and localStorage snooze.
		visible = shouldShowInstallGuidance(true);
	});

	function dismiss() {
		snoozeInstallGuidance();
		visible = false;
	}
</script>

{#if visible}
	<div
		class="mb-4 flex items-start justify-between gap-3 rounded-xl border p-4"
		style="border-color: var(--color-accent); background: var(--color-surface)"
		role="banner"
		aria-label="Install guidance"
	>
		<div class="flex flex-col gap-1">
			<p class="text-sm font-semibold" style="color: var(--color-accent)">Add to Home Screen</p>
			<p class="text-sm" style="color: var(--color-text, #1A1A1A)">
				Tap Share, then Add to Home Screen
			</p>
		</div>
		<button
			onclick={dismiss}
			class="shrink-0 text-sm"
			style="color: var(--color-muted)"
			aria-label="Dismiss install guidance"
		>
			✕
		</button>
	</div>
{/if}
