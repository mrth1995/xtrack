<script lang="ts">
	import type { PageData } from './$types';
	import InstallGuidanceBanner from '$lib/components/InstallGuidanceBanner.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const household = $derived(data.household);
	const members = $derived(data.members);
	const recentExpenses = $derived(data.recentExpenses);

	function formatAmount(amount: number): string {
		if (amount >= 1_000_000) {
			return `${(amount / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
		}
		if (amount >= 1_000) {
			return `${(amount / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })}k`;
		}
		return amount.toLocaleString('id-ID');
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short'
		});
	}
</script>

<main class="flex min-h-screen flex-col px-4 py-8">
	<div class="mx-auto w-full max-w-sm">
		<!-- Install guidance banner — shown only post-auth in Safari, never standalone -->
		<InstallGuidanceBanner />

		<!-- Household identity block -->
		<div class="mb-6">
			<p class="text-sm" style="color: var(--color-muted)">Household</p>
			<h1 class="text-[28px] font-semibold leading-tight" style="color: var(--color-text, #1A1A1A)">
				{household?.name ?? 'Your household'}
			</h1>
			<p class="mt-1 text-sm" style="color: var(--color-muted)">
				{members.length}
				{members.length === 1 ? 'member' : 'members'}
			</p>
		</div>

		<!-- Primary action: View household details — D-30 -->
		<a
			href="/household"
			class="mb-6 flex min-h-[48px] items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors"
			style="background: var(--color-accent)"
		>
			View household details
		</a>

		<!-- Shared-data proof: recent household expenses -->
		{#if recentExpenses.length > 0}
			<div
				class="mb-4 rounded-xl border p-4"
				style="border-color: var(--color-border, #E7DED0); background: var(--color-surface)"
			>
				<p class="mb-3 text-sm font-semibold" style="color: var(--color-text, #1A1A1A)">
					Recent expenses
				</p>
				<ul class="flex flex-col gap-2">
					{#each recentExpenses as expense (expense.id)}
						<li class="flex items-center justify-between">
							<div>
								<span class="text-sm font-semibold" style="color: var(--color-text, #1A1A1A)">
									{expense.category}
								</span>
								{#if expense.note}
									<span class="ml-1 text-sm" style="color: var(--color-muted)">
										· {expense.note}
									</span>
								{/if}
							</div>
							<div class="flex flex-col items-end">
								<span class="text-sm font-semibold" style="color: var(--color-text, #1A1A1A)">
									Rp {formatAmount(expense.amount)}
								</span>
								<span class="text-xs" style="color: var(--color-muted)">
									{formatDate(expense.spent_at)}
								</span>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{:else}
			<div
				class="mb-4 rounded-xl border p-4"
				style="border-color: var(--color-border, #E7DED0); background: var(--color-surface)"
			>
				<p class="text-sm" style="color: var(--color-muted)">
					No expenses logged yet. Add your first expense to see shared activity here.
				</p>
			</div>
		{/if}

		<!-- Secondary: settings/invite link -->
		<a
			href="/settings/invite"
			class="mb-3 flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
			style="border-color: var(--color-border, #E7DED0); color: var(--color-muted)"
		>
			Invite a member
		</a>

		<form method="POST" action="/logout">
			<button
				type="submit"
				class="flex min-h-[44px] w-full items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
				style="border-color: var(--color-border, #E7DED0); color: var(--color-muted); background: transparent"
			>
				Log out
			</button>
		</form>
	</div>
</main>
