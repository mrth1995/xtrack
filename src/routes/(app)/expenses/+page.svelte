<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import ExpenseList from '$lib/components/ExpenseList.svelte';
	import { toDateInputValue, formatDisplayDate } from '$lib/expenses/formatters';
	import { getQueuedExpenses } from '$lib/offline/expense-queue';
	import type { QueuedExpense, SyncStatus } from '$lib/offline/types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	type ExpenseItem = (typeof data.expenses)[number] & {
		client_id?: string;
		server_id?: string;
		household_id?: string;
		sync_status?: SyncStatus;
		sync_error?: string | null;
	};

	interface ExpenseGroup {
		dateKey: string; // YYYY-MM-DD in WIB
		label: string; // e.g. "26 Apr" via formatDisplayDate
		expenses: ExpenseItem[];
	}

	let visibleExpenses = $state<ExpenseItem[]>(
		data.expenses.map((expense) => ({ ...expense, server_id: expense.id }))
	);

	function queuedToExpenseItem(expense: QueuedExpense): ExpenseItem {
		return {
			id: expense.client_id,
			client_id: expense.client_id,
			server_id: expense.server_id,
			household_id: expense.household_id,
			amount: expense.amount,
			category: expense.category,
			note: expense.note,
			spent_at: expense.spent_at,
			sync_status: expense.sync_status,
			sync_error: expense.last_error
		};
	}

	function mergeExpenses(localRows: ExpenseItem[]): void {
		const merged = new Map<string, ExpenseItem>();
		for (const expense of [...localRows, ...visibleExpenses]) {
			const key = expense.client_id ?? expense.id;
			if (!merged.has(key)) {
				merged.set(key, expense);
			}
		}
		visibleExpenses = Array.from(merged.values()).sort((a, b) =>
			b.spent_at.localeCompare(a.spent_at)
		);
	}

	onMount(() => {
		void (async () => {
			const queued = await getQueuedExpenses();
			const localRows = queued
				.filter((expense) => expense.household_id === data.householdId)
				.map(queuedToExpenseItem);
			mergeExpenses(localRows);
		})();
	});

	const grouped = $derived.by<ExpenseGroup[]>(() => {
		const map = new Map<string, ExpenseItem[]>();
		for (const e of visibleExpenses) {
			const key = toDateInputValue(e.spent_at);
			const existing = map.get(key);
			if (existing) existing.push(e);
			else map.set(key, [e]);
		}
		return Array.from(map.entries()).map(([dateKey, expenses]) => ({
			dateKey,
			// Use the first expense's spent_at to derive the localised label.
			label: formatDisplayDate(expenses[0].spent_at),
			expenses
		}));
	});
</script>

<main class="flex min-h-screen flex-col px-4 py-8">
	<div class="mx-auto w-full max-w-sm">
		<a
			href="/"
			class="mb-4 inline-flex items-center text-sm"
			style="color: var(--color-muted); touch-action: manipulation;"
		>
			← Back
		</a>

		<h1 class="mb-4 text-xl font-semibold" style="color: var(--color-foreground);">
			All expenses
		</h1>

		{#if visibleExpenses.length === 0}
			<div
				class="rounded-xl border p-4"
				style="border-color: var(--color-surface); background: var(--color-surface);"
			>
				<p class="text-sm font-semibold" style="color: var(--color-foreground);">
					No expenses yet
				</p>
				<p class="mt-1 text-sm" style="color: var(--color-muted);">
					Log your first expense from the home screen.
				</p>
				<a
					href="/"
					class="mt-3 inline-block text-sm"
					style="color: var(--color-accent); touch-action: manipulation;"
				>
					← Go home
				</a>
			</div>
		{:else}
			{#each grouped as group (group.dateKey)}
				<div class="mb-6">
					<p class="mb-1 text-sm" style="color: var(--color-muted);">{group.label}</p>
					<ExpenseList expenses={group.expenses} />
				</div>
			{/each}
		{/if}
	</div>
</main>
