<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let copied = $state(false);

	async function copyCode() {
		if (!data.invite?.code) return;
		try {
			await navigator.clipboard.writeText(data.invite.code);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			// Clipboard API unavailable — noop
		}
	}

	function formatExpiry(expiresAt: string): string {
		const d = new Date(expiresAt);
		return d.toLocaleString('id-ID', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<main class="flex min-h-screen flex-col px-4 py-8">
	<div class="mx-auto w-full max-w-sm">
		<div class="mb-6">
			<a href="/" class="mb-4 inline-flex items-center text-sm" style="color: var(--color-muted)">
				← Back
			</a>
			<h1 class="text-xl font-semibold" style="color: var(--color-text)">Invite to household</h1>
		</div>

		{#if data.error}
			<div class="rounded-xl border p-4" style="border-color: var(--color-border)">
				<p class="text-sm" style="color: var(--color-destructive)">{data.error}</p>
			</div>
		{:else if data.invite}
			{#if data.invite.isUsed}
				<!-- Joined status view per D-27 -->
				<div
					class="mb-4 rounded-xl border p-4"
					style="border-color: var(--color-border); background: var(--color-surface)"
				>
					<p class="mb-1 text-sm font-semibold" style="color: var(--color-text)">
						Invite accepted
					</p>
					<p class="text-sm" style="color: var(--color-muted)">
						Someone has joined your household using this invite code.
					</p>
				</div>
			{:else}
				<!-- Active invite view per D-22 through D-26 -->
				<div
					class="mb-4 rounded-xl border p-4"
					style="border-color: var(--color-border); background: var(--color-surface)"
				>
					<p class="mb-1 text-sm font-semibold" style="color: var(--color-muted)">Invite code</p>
					<p
						class="mb-2 font-mono text-2xl font-semibold tracking-widest"
						style="color: var(--color-text)"
					>
						{data.invite.code}
					</p>
					<!-- Expiry information per D-24 -->
					<p class="text-xs" style="color: var(--color-muted)">
						expires {formatExpiry(data.invite.expires_at)}
					</p>
				</div>

				<!-- Copy code is the primary share action per D-23 -->
				<button
					onclick={copyCode}
					class="flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors"
					style="background: var(--color-accent)"
				>
					{copied ? 'Copied!' : 'Copy code'}
				</button>
			{/if}
		{/if}

		<p class="mt-4 text-xs" style="color: var(--color-muted)">
			Invite codes expire after 24 hours and can only be used once.
		</p>
	</div>
</main>
