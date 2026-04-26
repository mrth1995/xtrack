<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const household = $derived(data.household);
	const members = $derived(data.members);

	function formatJoinDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<main class="flex min-h-screen flex-col px-4 py-8">
	<div class="mx-auto w-full max-w-sm">
		<!-- Back nav -->
		<a href="/" class="mb-4 inline-flex items-center text-sm" style="color: var(--color-muted)">
			← Back
		</a>

		<!-- Household identity -->
		<div class="mb-6">
			<p class="text-sm" style="color: var(--color-muted)">Household details</p>
			<h1 class="text-xl font-semibold" style="color: var(--color-text, #1A1A1A)">
				{household?.name ?? 'Your household'}
			</h1>
		</div>

		<!-- Members section — D-31: combines household identity and member status -->
		<div
			class="rounded-xl border p-4"
			style="border-color: var(--color-border, #E7DED0); background: var(--color-surface)"
		>
			<p class="mb-3 text-sm font-semibold" style="color: var(--color-text, #1A1A1A)">
				Members
			</p>

			{#if members.length === 0}
				<p class="text-sm" style="color: var(--color-muted)">No members yet.</p>
			{:else}
				<ul class="flex flex-col gap-3">
					{#each members as member (member.id)}
						<li class="flex items-start justify-between">
							<div>
								<p class="text-sm font-semibold" style="color: var(--color-text, #1A1A1A)">
									{member.displayName}
								</p>
								{#if member.email && member.email !== member.displayName}
									<p class="text-xs" style="color: var(--color-muted)">{member.email}</p>
								{/if}
								<p class="text-xs" style="color: var(--color-muted)">
									Joined {formatJoinDate(member.joinedAt)}
								</p>
							</div>
							{#if member.role === 'owner'}
								<span
									class="rounded-full px-2 py-0.5 text-xs font-semibold"
									style="background: var(--color-accent); color: #fff"
								>
									Owner
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Invite action -->
		<div class="mt-4">
			<a
				href="/settings/invite"
				class="flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
				style="border-color: var(--color-border, #E7DED0); color: var(--color-muted)"
			>
				Invite a member
			</a>
		</div>

		<!-- Secondary logout — AUTH-03: logout visible from all signed-in surfaces -->
		<div class="mt-3">
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
	</div>
</main>
