<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();

	// Determine the current step based on form action data
	let step = $derived(form?.step ?? 'entry');
</script>

<main class="flex min-h-screen flex-col items-center justify-center px-4">
	<div class="w-full max-w-sm">
		{#if step === 'confirm' && form && 'householdName' in form}
			<!-- Confirmation step: show household name before final join per D-08 -->
			<div class="mb-6">
				<h1 class="text-xl font-semibold" style="color: var(--color-text)">Join household</h1>
				<p class="mt-1 text-sm" style="color: var(--color-muted)">
					You are about to join this household.
				</p>
			</div>

			<div
				class="mb-6 rounded-xl border p-4"
				style="border-color: var(--color-border); background: var(--color-surface)"
			>
				<p class="text-sm font-semibold" style="color: var(--color-muted)">Household</p>
				<p class="mt-1 text-lg font-semibold" style="color: var(--color-text)">
					{form.householdName}
				</p>
			</div>

			<!-- Confirm join action -->
			<form method="POST" action="?/join" use:enhance class="flex flex-col gap-3">
				<input type="hidden" name="code" value={form.code} />

				<button
					type="submit"
					class="flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors"
					style="background: var(--color-accent)"
				>
					Confirm and join
				</button>

				<a
					href="/onboarding/join"
					class="flex min-h-[44px] items-center justify-center text-sm"
					style="color: var(--color-muted)"
				>
					Use a different code
				</a>
			</form>
		{:else}
			<!-- Entry step: code input per D-05 and D-06 -->
			<div class="mb-6">
				<a
					href="/onboarding"
					class="mb-4 inline-flex items-center text-sm"
					style="color: var(--color-muted)"
				>
					← Back
				</a>
				<h1 class="text-xl font-semibold" style="color: var(--color-text)">Join with code</h1>
				<p class="mt-1 text-sm" style="color: var(--color-muted)">
					Enter the invite code shared by your household member.
				</p>
			</div>

			<form method="POST" action="?/lookupInvite" use:enhance>
				<div class="mb-4">
					<label
						for="code"
						class="mb-1 block text-sm font-semibold"
						style="color: var(--color-text)"
					>
						Invite code
					</label>
					<!-- Standard text input with paste support per D-06 -->
					<input
						id="code"
						name="code"
						type="text"
						required
						autocomplete="off"
						autocapitalize="characters"
						value={form?.code ?? ''}
						placeholder="e.g. A1B2C3D4"
						class="w-full rounded-xl border px-4 py-3 text-base uppercase tracking-wider outline-none transition-colors focus:ring-2"
						style="
							border-color: var(--color-border);
							background: var(--color-surface);
							color: var(--color-text);
						"
					/>
					{#if form?.error}
						<!-- Inline error on same screen per D-09 -->
						<p class="mt-1 text-sm" style="color: var(--color-destructive)">{form.error}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-3">
					<button
						type="submit"
						class="flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors"
						style="background: var(--color-accent)"
					>
						Join with code
					</button>

					<!-- Secondary action: switch to create per D-11 -->
					<a
						href="/onboarding/create"
						class="flex min-h-[44px] items-center justify-center text-sm"
						style="color: var(--color-muted)"
					>
						Create a new household instead
					</a>
				</div>
			</form>
		{/if}
	</div>
</main>
