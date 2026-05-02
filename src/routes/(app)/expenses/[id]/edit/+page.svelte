<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		toDateInputValue,
		fromDateInputValue,
		formatNumpad
	} from '$lib/expenses/formatters';
	import { VALID_CATEGORIES, CATEGORY_META } from '$lib/expenses/schemas';
	import {
		deleteQueuedExpense,
		getQueuedExpense,
		updateQueuedExpense
	} from '$lib/offline/expense-queue';
	import { flushExpenseQueue } from '$lib/offline/expense-sync';
	import type { QueuedExpense } from '$lib/offline/types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	type EditableExpense = {
		id: string;
		amount: number;
		category: string;
		note: string | null;
		spent_at: string;
	};

	const isLocalOnly = $derived('localOnly' in data && data.localOnly === true);
	let localExpense = $state<QueuedExpense | null>(null);
	function initialExpense(): EditableExpense | null {
		return 'expense' in data && data.expense ? data.expense : null;
	}

	let currentExpense = $state<EditableExpense | null>(initialExpense());
	let localError = $state<string | null>(null);
	let retrying = $state(false);
	const localClientId = $derived(isLocalOnly && 'id' in data ? data.id : currentExpense?.id);
	const isSyncing = $derived(localExpense?.sync_status === 'syncing');

	// Field state
	let amount = $state<string>('');
	let selectedCategory = $state<string>('');
	let note = $state<string>('');
	let dateLocal = $state<string>('');
	let fieldsInitialized = $state(false);

	$effect(() => {
		if (fieldsInitialized || !currentExpense) return;
		amount = String(currentExpense.amount);
		selectedCategory = currentExpense.category;
		note = currentExpense.note ?? '';
		dateLocal = toDateInputValue(currentExpense.spent_at);
		fieldsInitialized = true;
	});

	// Date picker value is YYYY-MM-DD WIB; submit ISO UTC.
	const spentAtIso = $derived(dateLocal ? fromDateInputValue(dateLocal) : '');

	// Two-step delete state
	let deleteConfirm = $state(false);
	let deleteTimer: ReturnType<typeof setTimeout> | null = null;
	let deleteFormRef: HTMLFormElement | undefined = $state();

	onMount(() => {
		if (!isLocalOnly || !localClientId) {
			return;
		}

		void (async () => {
			const queued = await getQueuedExpense(localClientId);
			if (!queued) {
				localError = 'Expense not found.';
				return;
			}
			localExpense = queued;
			currentExpense = {
				id: queued.client_id,
				amount: queued.amount,
				category: queued.category,
				note: queued.note,
				spent_at: queued.spent_at
			};
		})();
	});

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

	async function saveLocalExpense() {
		if (!localExpense || isSyncing) return;

		const parsedAmount = Number(amount);
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !spentAtIso) {
			localError = 'Invalid input';
			return;
		}

		const updated = await updateQueuedExpense(localExpense.client_id, {
			amount: parsedAmount,
			category: selectedCategory as QueuedExpense['category'],
			note: note.trim().length > 0 ? note : null,
			spent_at: spentAtIso
		});

		if (!updated) {
			localError = "Couldn't save changes. Check your connection and try again.";
			return;
		}

		localExpense = updated;
		await goto('/expenses');
	}

	async function deleteLocalExpense() {
		if (!localExpense || isSyncing) return;
		await deleteQueuedExpense(localExpense.client_id);
		await goto('/expenses');
	}

	async function retryLocalExpense() {
		if (!localExpense || isSyncing) return;
		retrying = true;
		try {
			await flushExpenseQueue({
				householdId: data.householdId ?? localExpense.household_id,
				sessionReady: true,
				clientId: localExpense.client_id
			});
			const refreshed = await getQueuedExpense(localExpense.client_id);
			if (!refreshed) {
				await goto('/expenses');
				return;
			}
			localExpense = refreshed;
			currentExpense = {
				id: refreshed.client_id,
				amount: refreshed.amount,
				category: refreshed.category,
				note: refreshed.note,
				spent_at: refreshed.spent_at
			};
			fieldsInitialized = false;
		} finally {
			retrying = false;
		}
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

		<form
			method="POST"
			action="?/saveEdit"
			use:enhance={({ cancel }) => {
				if (isLocalOnly) {
					cancel();
					void saveLocalExpense();
				}
			}}
		>
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
					disabled={isSyncing}
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
							disabled={isSyncing}
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
					disabled={isSyncing}
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
					disabled={isSyncing}
					class="w-full rounded-lg px-3 text-base"
					style="min-height: 48px; border: 1px solid var(--color-surface); background: var(--color-bg); color: var(--color-foreground);"
				/>
				<input type="hidden" name="spent_at" value={spentAtIso} />
			</div>

			{#if form && 'error' in form && form.error}
				<p class="mb-3 text-sm" style="color: var(--color-destructive);">{form.error}</p>
			{/if}
			{#if localError}
				<p class="mb-3 text-sm" style="color: var(--color-destructive);">{localError}</p>
			{/if}

			<button
				type="submit"
				disabled={isSyncing}
				class="flex min-h-[48px] w-full items-center justify-center rounded-lg text-base font-semibold"
				style="background: var(--color-accent); color: var(--color-accent-foreground); border: 0; touch-action: manipulation;"
			>
				Save changes
			</button>
		</form>

		{#if localExpense?.sync_status === 'failed'}
			<button
				type="button"
				onclick={retryLocalExpense}
				disabled={retrying || isSyncing}
				class="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-lg text-base font-semibold"
				style="background: var(--color-surface); color: var(--color-foreground); border: 0; touch-action: manipulation;"
			>
				{retrying ? 'Retrying...' : 'Retry sync'}
			</button>
		{/if}

		<form
			bind:this={deleteFormRef}
			method="POST"
			action="?/deleteExpense"
			class="mt-3"
			use:enhance={({ cancel }) => {
				if (isLocalOnly) {
					cancel();
					void deleteLocalExpense();
				}
			}}
		>
			<button
				type="button"
				onclick={onDeleteClick}
				disabled={isSyncing}
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
