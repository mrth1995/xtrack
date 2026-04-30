<script lang="ts">
	interface Props {
		amountStr: string;
		onDigit: (digit: string) => void;
		onBackspace: () => void;
	}

	let { amountStr: _amountStr, onDigit, onBackspace }: Props = $props();

	// amountStr is accepted for symmetry with parent state but the Numpad
	// itself is purely controlled — it does not render the amount, only the keys.
</script>

<div class="grid grid-cols-3 gap-2" style="touch-action: manipulation; user-select: none;">
	<button
		type="button"
		onclick={() => onDigit('7')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		7
	</button>
	<button
		type="button"
		onclick={() => onDigit('8')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		8
	</button>
	<button
		type="button"
		onclick={() => onDigit('9')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		9
	</button>
	<button
		type="button"
		onclick={() => onDigit('4')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		4
	</button>
	<button
		type="button"
		onclick={() => onDigit('5')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		5
	</button>
	<button
		type="button"
		onclick={() => onDigit('6')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		6
	</button>
	<button
		type="button"
		onclick={() => onDigit('1')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		1
	</button>
	<button
		type="button"
		onclick={() => onDigit('2')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		2
	</button>
	<button
		type="button"
		onclick={() => onDigit('3')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		3
	</button>

	<!-- Row 4: 000, 0, backspace — all first-class keys per D-05 -->
	<button
		type="button"
		onclick={() => onDigit('000')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		000
	</button>
	<button
		type="button"
		onclick={() => onDigit('0')}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		0
	</button>
	<button
		type="button"
		aria-label="Delete last digit"
		onclick={() => onBackspace()}
		class="flex min-h-[56px] items-center justify-center rounded-xl text-xl font-semibold"
		style="background: var(--color-surface); color: var(--color-foreground); touch-action: manipulation; user-select: none;"
	>
		⌫
	</button>
</div>
