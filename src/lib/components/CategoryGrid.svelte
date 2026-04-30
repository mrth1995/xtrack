<script lang="ts">
	import { VALID_CATEGORIES, CATEGORY_META } from '$lib/expenses/schemas';

	interface Props {
		disabled: boolean;
		pressedCategory: string | null;
		onCategoryTap: (category: string) => void;
	}

	let { disabled, pressedCategory, onCategoryTap }: Props = $props();

	// 3-3-1 layout per D-12: split the 7 categories into rows of 3, 3, 1.
	const ROW1 = VALID_CATEGORIES.slice(0, 3); // Food, Transport, Entertainment
	const ROW2 = VALID_CATEGORIES.slice(3, 6); // Utilities, Shopping, Health
	const ROW3 = VALID_CATEGORIES.slice(6);     // Others
</script>

<div class="grid grid-cols-3 gap-2">
	{#each ROW1 as cat}
		{@const isPressed = pressedCategory === cat}
		<button
			type="button"
			disabled={disabled}
			onclick={() => onCategoryTap(cat)}
			class="flex min-h-[64px] flex-col items-center justify-center rounded-xl py-3 text-sm font-semibold"
			style="background: {isPressed ? 'var(--color-pressed)' : 'var(--color-surface)'}; color: var(--color-foreground); border: {isPressed ? '2px solid var(--color-accent)' : '0'}; touch-action: manipulation; pointer-events: {disabled ? 'none' : 'auto'};"
		>
			<span class="text-xl" aria-hidden="true">{CATEGORY_META[cat].emoji}</span>
			<span>{cat}</span>
		</button>
	{/each}
	{#each ROW2 as cat}
		{@const isPressed = pressedCategory === cat}
		<button
			type="button"
			disabled={disabled}
			onclick={() => onCategoryTap(cat)}
			class="flex min-h-[64px] flex-col items-center justify-center rounded-xl py-3 text-sm font-semibold"
			style="background: {isPressed ? 'var(--color-pressed)' : 'var(--color-surface)'}; color: var(--color-foreground); border: {isPressed ? '2px solid var(--color-accent)' : '0'}; touch-action: manipulation; pointer-events: {disabled ? 'none' : 'auto'};"
		>
			<span class="text-xl" aria-hidden="true">{CATEGORY_META[cat].emoji}</span>
			<span>{cat}</span>
		</button>
	{/each}
	{#each ROW3 as cat}
		{@const isPressed = pressedCategory === cat}
		<button
			type="button"
			disabled={disabled}
			onclick={() => onCategoryTap(cat)}
			class="col-span-1 flex min-h-[64px] flex-col items-center justify-center rounded-xl py-3 text-sm font-semibold"
			style="background: {isPressed ? 'var(--color-pressed)' : 'var(--color-surface)'}; color: var(--color-foreground); border: {isPressed ? '2px solid var(--color-accent)' : '0'}; touch-action: manipulation; pointer-events: {disabled ? 'none' : 'auto'};"
		>
			<span class="text-xl" aria-hidden="true">{CATEGORY_META[cat].emoji}</span>
			<span>{cat}</span>
		</button>
	{/each}
</div>
