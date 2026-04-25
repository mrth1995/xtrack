<script lang="ts">
	// Household choice screen — equal-weight create/join options per D-01 and D-02.
	// Neither action is the default primary path.
</script>

<main class="flex min-h-screen flex-col items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<h1 class="text-xl font-semibold" style="color: var(--color-text)">No household yet</h1>
			<p class="mt-2 text-sm" style="color: var(--color-muted)">
				Create a household or join with a code to start sharing expenses.
			</p>
		</div>

		<div class="flex flex-col gap-3">
			<!-- Create household — equal-weight card per D-02 -->
			<a
				href="/onboarding/create"
				class="flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
				style="
					border-color: var(--color-border);
					background: var(--color-surface);
					color: var(--color-text);
				"
			>
				Create household
			</a>

			<!-- Join with code — equal-weight card per D-02 -->
			<a
				href="/onboarding/join"
				class="flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
				style="
					border-color: var(--color-border);
					background: var(--color-surface);
					color: var(--color-text);
				"
			>
				Join with code
			</a>
		</div>
	</div>
</main>
