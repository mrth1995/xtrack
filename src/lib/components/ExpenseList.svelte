<script lang="ts">
	import { formatIDR, formatDisplayDate } from '$lib/expenses/formatters';
	import { CATEGORY_META, type Category } from '$lib/expenses/schemas';

	export interface ExpenseListItem {
		id: string;
		amount: number;
		category: string;
		note: string | null;
		spent_at: string;
	}

	interface Props {
		expenses: ExpenseListItem[];
	}

	let { expenses }: Props = $props();

	function emojiFor(category: string): string {
		return CATEGORY_META[category as Category]?.emoji ?? '';
	}
</script>

{#if expenses.length === 0}
	<div
		class="rounded-xl border p-4"
		style="border-color: var(--color-surface); background: var(--color-surface)"
	>
		<p class="text-sm font-semibold" style="color: var(--color-foreground)">
			No expenses yet today
		</p>
		<p class="mt-1 text-sm" style="color: var(--color-muted)">
			Tap a category above to log your first one.
		</p>
	</div>
{:else}
	<ul class="flex flex-col">
		{#each expenses as expense (expense.id)}
			<li>
				<a
					href="/expenses/{expense.id}/edit"
					class="flex min-h-[48px] items-center justify-between border-b py-3"
					style="border-color: var(--color-surface); touch-action: manipulation;"
				>
					<div class="flex flex-col">
						<span class="text-base font-semibold" style="color: var(--color-foreground)">
							<span aria-hidden="true">{emojiFor(expense.category)}</span>
							{expense.category}
						</span>
						{#if expense.note}
							<span class="text-sm" style="color: var(--color-muted)">{expense.note}</span>
						{/if}
					</div>
					<div class="flex flex-col items-end">
						<span class="text-base font-semibold" style="color: var(--color-foreground)">
							{formatIDR(expense.amount)}
						</span>
						<span class="text-sm" style="color: var(--color-muted)">
							{formatDisplayDate(expense.spent_at)}
						</span>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
