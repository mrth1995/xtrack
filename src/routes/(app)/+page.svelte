<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import InstallGuidanceBanner from '$lib/components/InstallGuidanceBanner.svelte';
	import Numpad from '$lib/components/Numpad.svelte';
	import CategoryGrid from '$lib/components/CategoryGrid.svelte';
	import NoteSheet from '$lib/components/NoteSheet.svelte';
	import GearMenu from '$lib/components/GearMenu.svelte';
	import ExpenseList from '$lib/components/ExpenseList.svelte';
	import { formatNumpad, toDateInputValue } from '$lib/expenses/formatters';
	import {
		getQueuedExpenses,
		queueExpense,
		updateQueuedExpense
	} from '$lib/offline/expense-queue';
	import type { QueuedExpense, SyncStatus } from '$lib/offline/types';

	interface Props {
		data: PageData;
	}

	interface SavedExpense {
		id: string;
		amount: number;
		category: string;
		note: string | null;
		spent_at: string;
		client_id: string;
		sync_status?: SyncStatus;
		household_id?: string;
		server_id?: string;
	}

	let { data }: Props = $props();

	let amountStr = $state('');
	let clientId = $state(crypto.randomUUID());
	let debounced = $state(false);
	let pressedCategory = $state<string | null>(null);
	let sheetOpen = $state(false);
	let savedExpense = $state<{ id: string; category: string; amount: number } | null>(null);
	let lastError = $state<string | null>(null);
	let errorTimer: ReturnType<typeof setTimeout> | null = null;

	const initialTodayExpenses = data.todayExpenses;
	let todayExpenses = $state(initialTodayExpenses);

	let saveFormRef: HTMLFormElement | undefined = $state();
	let pendingCategory = $state<string | null>(null);
	let pendingAmount = $state(0);

	let noteFormRef: HTMLFormElement | undefined = $state();
	let pendingNote = $state('');

	const displayAmount = $derived(formatNumpad(amountStr));
	const displayColor = $derived(amountStr === '' || amountStr === '0' ? 'var(--color-muted)' : 'var(--color-foreground)');

	function showError(msg: string) {
		lastError = msg;
		if (errorTimer) clearTimeout(errorTimer);
		errorTimer = setTimeout(() => {
			lastError = null;
		}, 4000);
	}

	function isToday(spentAt: string): boolean {
		return toDateInputValue(spentAt) === toDateInputValue(new Date().toISOString());
	}

	function queuedToSavedExpense(expense: QueuedExpense): SavedExpense {
		return {
			id: expense.client_id,
			client_id: expense.client_id,
			server_id: expense.server_id,
			household_id: expense.household_id,
			amount: expense.amount,
			category: expense.category,
			note: expense.note,
			spent_at: expense.spent_at,
			sync_status: expense.sync_status
		};
	}

	function mergeTodayExpenses(rows: SavedExpense[]): void {
		const merged = new Map<string, SavedExpense>();
		for (const row of [...rows, ...todayExpenses]) {
			const key = row.client_id ?? row.id;
			if (!merged.has(key)) {
				merged.set(key, row);
			}
		}
		todayExpenses = Array.from(merged.values()).sort((a, b) =>
			b.spent_at.localeCompare(a.spent_at)
		);
	}

	async function queuePendingExpense(formData: FormData): Promise<boolean> {
		const householdId = data.householdId;
		if (!householdId) {
			showError("Couldn't save. Check your connection and try again.");
			return false;
		}

		const amount = Number(formData.get('amount'));
		const category = formData.get('category');
		const spentAt = formData.get('spent_at');
		const currentClientId = formData.get('client_id');

		if (
			!Number.isFinite(amount) ||
			amount <= 0 ||
			typeof category !== 'string' ||
			typeof spentAt !== 'string' ||
			typeof currentClientId !== 'string'
		) {
			showError("Couldn't save. Check your connection and try again.");
			return false;
		}

		const queued = await queueExpense({
			amount,
			category: category as QueuedExpense['category'],
			note: null,
			spent_at: spentAt,
			client_id: currentClientId,
			household_id: data.householdId ?? householdId
		});
		const visible = queuedToSavedExpense({ ...queued, sync_status: 'queued' });
		savedExpense = {
			id: queued.client_id,
			category: queued.category,
			amount: queued.amount
		};
		mergeTodayExpenses([visible]);
		amountStr = '';
		clientId = crypto.randomUUID();
		sheetOpen = true;
		return true;
	}

	onMount(() => {
		void (async () => {
			const queued = await getQueuedExpenses();
			const visible = queued
				.filter((row) => row.household_id === data.householdId && isToday(row.spent_at))
				.map(queuedToSavedExpense);
			mergeTodayExpenses(visible);
		})();
	});

	function appendDigit(digit: string) {
		const next = amountStr === '0' ? digit : amountStr + digit;
		const normalized = next.replace(/^0+(?=\d)/, '');
		const amount = parseInt(normalized, 10);

		if (!Number.isFinite(amount)) {
			amountStr = '';
			return;
		}
		if (amount > 99_999_999) return;

		amountStr = normalized;
	}

	function backspace() {
		amountStr = amountStr.slice(0, -1);
	}

	async function onCategoryTap(category: string) {
		if (debounced) return;
		if (amountStr === '' || amountStr === '0') return;

		const amount = parseInt(amountStr, 10);
		if (!Number.isFinite(amount) || amount <= 0) return;

		debounced = true;
		pressedCategory = category;
		pendingCategory = category;
		pendingAmount = amount;

		await tick();
		saveFormRef?.requestSubmit();
	}

	function onSkip() {
		sheetOpen = false;
		savedExpense = null;
	}

	async function onSaveNote(note: string) {
		if (!savedExpense) {
			sheetOpen = false;
			return;
		}

		pendingNote = note;
		const localQueued = await updateQueuedExpense(savedExpense.id, { note });
		if (localQueued) {
			todayExpenses = todayExpenses.map((e) =>
				e.client_id === localQueued.client_id || e.id === localQueued.client_id
					? { ...e, note: localQueued.note, sync_status: 'queued' }
					: e
			);
			sheetOpen = false;
			savedExpense = null;
			return;
		}

		await tick();
		noteFormRef?.requestSubmit();
	}
</script>

<main class="flex min-h-screen flex-col px-4 py-8">
	<div class="mx-auto w-full max-w-sm">
		<InstallGuidanceBanner />

		<div class="mb-4 flex items-center justify-end">
			<GearMenu />
		</div>

		<div class="mb-6 text-center">
			<p class="text-[48px] font-semibold leading-none" style="color: {displayColor};" aria-live="polite">
				{displayAmount}
			</p>
		</div>

		<div class="mb-6">
			<Numpad {amountStr} onDigit={appendDigit} onBackspace={backspace} />
		</div>

		<div class="mb-6">
			<CategoryGrid disabled={debounced} {pressedCategory} {onCategoryTap} />
		</div>

		{#if lastError}
			<p
				class="mb-4 text-center text-sm"
				style="color: var(--color-destructive);"
				aria-live="polite"
				role="status"
			>
				{lastError}
			</p>
		{/if}

		<div class="mb-4">
			<h2 class="mb-2 text-xl font-semibold" style="color: var(--color-foreground);">Today</h2>
			<ExpenseList expenses={todayExpenses} />
		</div>

		<div class="mb-8 text-center">
			<a href="/expenses" class="text-sm" style="color: var(--color-muted); touch-action: manipulation;">
				View all history →
			</a>
		</div>
	</div>

	<form
		bind:this={saveFormRef}
		method="POST"
		action="?/saveExpense"
		style="display: none;"
		use:enhance={() => {
			return async ({ result, formData }) => {
				if (
					result.type === 'success' &&
					result.data &&
					typeof result.data === 'object' &&
					'expense' in result.data
				) {
					const resultData = result.data as { expense: SavedExpense; duplicate?: boolean };
					const inserted = resultData.expense;
					savedExpense = {
						id: inserted.id,
						category: inserted.category,
						amount: inserted.amount
					};

					if (!todayExpenses.some((e) => e.id === inserted.id)) {
						mergeTodayExpenses([inserted]);
					}

					amountStr = '';
					clientId = crypto.randomUUID();
					sheetOpen = true;
				} else if (result.type === 'error' || navigator.onLine === false) {
					await queuePendingExpense(formData);
				} else {
					showError("Couldn't save. Check your connection and try again.");
				}

				setTimeout(() => {
					debounced = false;
					pressedCategory = null;
				}, 500);
			};
		}}
	>
		<input type="hidden" name="amount" value={pendingAmount} />
		<input type="hidden" name="category" value={pendingCategory ?? ''} />
		<input type="hidden" name="client_id" value={clientId} />
		<input type="hidden" name="spent_at" value={new Date().toISOString()} />
	</form>

	<form
		bind:this={noteFormRef}
		method="POST"
		action="?/saveNote"
		style="display: none;"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					if (savedExpense) {
						todayExpenses = todayExpenses.map((e) =>
							e.id === savedExpense!.id ? { ...e, note: pendingNote } : e
						);
					}
					sheetOpen = false;
					savedExpense = null;
				} else {
					showError("Couldn't save the note. Try again.");
				}
			};
		}}
	>
		<input type="hidden" name="expense_id" value={savedExpense?.id ?? ''} />
		<input type="hidden" name="note" value={pendingNote} />
	</form>

	<NoteSheet open={sheetOpen} expense={savedExpense} onSkip={onSkip} onSave={onSaveNote} />
</main>
