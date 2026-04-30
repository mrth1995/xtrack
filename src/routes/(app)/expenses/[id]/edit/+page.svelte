<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import {
		toDateInputValue,
		fromDateInputValue,
		formatNumpad
	} from '$lib/expenses/formatters';
	import { VALID_CATEGORIES, CATEGORY_META } from '$lib/expenses/schemas';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	// Field state
	let amount = $state<string>('');
	let selectedCategory = $state<string>('');
	let note = $state<string>('');
	let dateLocal = $state<string>('');
	let fieldsInitialized = $state(false);

	$effect(() => {
		if (fieldsInitialized) return;
		amount = String(data.expense.amount);
		selectedCategory = data.expense.category;
		note = data.expense.note ?? '';
		dateLocal = toDateInputValue(data.expense.spent_at);
		fieldsInitialized = true;
	});

	// Date picker value is YYYY-MM-DD WIB; submit ISO UTC.
	const spentAtIso = $derived(dateLocal ? fromDateInputValue(dateLocal) : '');

	// Two-step delete state
	let deleteConfirm = $state(false);
	let deleteTimer: ReturnType<typeof setTimeout> | null = null;
	let deleteFormRef: HTMLFormElement | undefined = $state();

	function onDeleteClick() {
		if (!deleteConfirm) {
			deleteConfirm = true;
			if (deleteTimer) clearTimeout(deleteTimer);
			deleteTimer = setTimeout(() => {
				deleteConfirm = false;
				deleteTimer = null;
			}, 3000);
		} else {
			deleteFormRef?.requestSubmit();
		}
	}

	function onAmountInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const cleaned = target.value.replace(/[^0-9]/g, '');
		amount = cleaned;
		target.value = cleaned;
	}
</script>

<main class="flex min-h-screen flex-col px-4 py-8">
	<div class="mx-auto w-full max-w-sm">
		<a
			href="/expenses"
			class="mb-4 inline-flex items-center text-sm"
			style="color: var(--color-muted); touch-action: manipulation;"
		>
			← Back
		</a>

		<h1 class="mb-6 text-xl font-semibold" style="color: var(--color-foreground);">
			Edit expense
		</h1>

		<form method="POST" action="?/saveEdit" use:enhance>
			<div class="mb-4">
				<label for="amount" class="mb-1 block text-sm" style="color: var(--color-muted);">
					Amount
				</label>
				<input
					id="amount"
					name="amount"
					type="text"
					inputmode="numeric"
					value={amount}
					oninput={onAmountInput}
					class="w-full rounded-lg px-3 text-base"
					style="min-height: 48px; border: 1px solid var(--color-surface); background: var(--color-bg); color: var(--color-foreground);"
				/>
				<p class="mt-1 text-sm" style="color: var(--color-muted);">
					= {formatNumpad(amount)}
				</p>
			</div>

			<div class="mb-4">
				<p class="mb-1 text-sm" style="color: var(--color-muted);">Category</p>
				<input type="hidden" name="category" value={selectedCategory} />
				<div class="grid grid-cols-3 gap-2">
					{#each VALID_CATEGORIES as cat}
						{@const isSelected = selectedCategory === cat}
						<button
							type="button"
							onclick={() => (selectedCategory = cat)}
							class="flex min-h-[64px] flex-col items-center justify-center rounded-xl py-3 text-sm font-semibold"
							style="background: {isSelected ? 'var(--color-pressed)' : 'var(--color-surface)'}; color: var(--color-foreground); border: {isSelected ? '2px solid var(--color-accent)' : '0'}; touch-action: manipulation;"
						>
							<span class="text-xl" aria-hidden="true">{CATEGORY_META[cat].emoji}</span>
							<span>{cat}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="mb-4">
				<label for="note" class="mb-1 block text-sm" style="color: var(--color-muted);">
					Note (optional)
				</label>
				<textarea
					id="note"
					name="note"
					bind:value={note}
					placeholder="Add a note..."
					class="w-full rounded-lg px-3 py-2 text-base"
					style="min-height: 80px; border: 1px solid var(--color-surface); background: var(--color-bg); color: var(--color-foreground); resize: none;"
				></textarea>
			</div>

			<div class="mb-6">
				<label for="date-local" class="mb-1 block text-sm" style="color: var(--color-muted);">
					Date
				</label>
				<input
					id="date-local"
					type="date"
					bind:value={dateLocal}
					class="w-full rounded-lg px-3 text-base"
					style="min-height: 48px; border: 1px solid var(--color-surface); background: var(--color-bg); color: var(--color-foreground);"
				/>
				<input type="hidden" name="spent_at" value={spentAtIso} />
			</div>

			{#if form && 'error' in form && form.error}
				<p class="mb-3 text-sm" style="color: var(--color-destructive);">{form.error}</p>
			{/if}

			<button
				type="submit"
				class="flex min-h-[48px] w-full items-center justify-center rounded-lg text-base font-semibold"
				style="background: var(--color-accent); color: var(--color-accent-foreground); border: 0; touch-action: manipulation;"
			>
				Save changes
			</button>
		</form>

		<form
			bind:this={deleteFormRef}
			method="POST"
			action="?/deleteExpense"
			class="mt-3"
			use:enhance
		>
			<button
				type="button"
				onclick={onDeleteClick}
				class="flex min-h-[48px] w-full items-center justify-center rounded-lg text-base font-semibold"
				style={deleteConfirm
					? 'background: transparent; color: var(--color-destructive); border: 1px solid var(--color-destructive); touch-action: manipulation;'
					: 'background: var(--color-destructive); color: var(--color-destructive-foreground); border: 0; touch-action: manipulation;'}
				aria-live="polite"
			>
				{deleteConfirm ? 'Tap again to confirm delete' : 'Delete expense'}
			</button>
		</form>
	</div>
</main>
