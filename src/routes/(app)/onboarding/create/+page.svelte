<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();
</script>

<main class="flex min-h-screen flex-col items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-6">
			<a
				href="/onboarding"
				class="mb-4 inline-flex items-center text-sm"
				style="color: var(--color-muted)"
			>
				← Back
			</a>
			<h1 class="text-xl font-semibold" style="color: var(--color-text)">Create household</h1>
			<p class="mt-1 text-sm" style="color: var(--color-muted)">
				Give your household a name to get started.
			</p>
		</div>

		<form method="POST" use:enhance>
			<div class="mb-4">
				<label for="name" class="mb-1 block text-sm font-semibold" style="color: var(--color-text)">
					Household name
				</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					autocomplete="off"
					value={form?.name ?? ''}
					placeholder="e.g. Ridwan & Dian"
					class="w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:ring-2"
					style="
						border-color: var(--color-border);
						background: var(--color-surface);
						color: var(--color-text);
					"
				/>
				{#if form?.error}
					<p class="mt-1 text-sm" style="color: var(--color-destructive)">{form.error}</p>
				{/if}
			</div>

			<button
				type="submit"
				class="flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors"
				style="background: var(--color-accent)"
			>
				Create household
			</button>
		</form>
	</div>
</main>
