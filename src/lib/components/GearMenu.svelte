<script lang="ts">
	let menuOpen = $state(false);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}
	function closeMenu() {
		menuOpen = false;
	}
</script>

<div class="relative">
	<button
		type="button"
		onclick={toggleMenu}
		aria-label="Open menu"
		class="flex items-center justify-center"
		style="min-width: 44px; min-height: 44px; color: var(--color-muted); background: transparent; border: 0; font-size: 20px; touch-action: manipulation;"
	>
		⚙
	</button>

	{#if menuOpen}
		<!-- Transparent backdrop catches outside-clicks (UI-SPEC Screen 5) -->
		<div
			class="fixed inset-0"
			style="z-index: 40; background: transparent;"
			role="presentation"
			onclick={closeMenu}
			onkeydown={closeMenu}
		></div>

		<div
			class="absolute"
			style="top: 3rem; right: 0; width: 200px; z-index: 50; background: var(--color-bg); border: 1px solid var(--color-surface); border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.10); overflow: hidden;"
		>
			<a
				href="/settings/invite"
				onclick={closeMenu}
				class="flex min-h-[48px] items-center px-4"
				style="color: var(--color-foreground); font-size: 16px;"
			>
				Invite member
			</a>
			<a
				href="/household"
				onclick={closeMenu}
				class="flex min-h-[48px] items-center px-4"
				style="color: var(--color-foreground); font-size: 16px;"
			>
				Household details
			</a>
			<div style="height: 1px; background: var(--color-surface);"></div>
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="flex min-h-[48px] w-full items-center px-4"
					style="color: var(--color-destructive); font-size: 16px; background: transparent; border: 0; text-align: left;"
				>
					Log out
				</button>
			</form>
		</div>
	{/if}
</div>
