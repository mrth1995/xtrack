<script lang="ts">
	import { CATEGORY_META, type Category } from '$lib/expenses/schemas';
	import { formatIDR } from '$lib/expenses/formatters';

	interface Props {
		open: boolean;
		expense: { id: string; category: string; amount: number } | null;
		onSkip: () => void;
		onSave: (note: string) => void;
	}

	let { open, expense, onSkip, onSave }: Props = $props();

	let noteText = $state('');
	let inputEl: HTMLTextAreaElement | undefined = $state();

	$effect(() => {
		if (open && inputEl) {
			// iOS autofocus workaround (Pitfall 2): defer to next tick so
			// the touch event has cleared.
			setTimeout(() => {
				inputEl?.focus();
			}, 50);
		}
		if (!open) noteText = '';
	});

	function emojiFor(category: string): string {
		return CATEGORY_META[category as Category]?.emoji ?? '';
	}
</script>

<div
	class="sheet"
	class:open
	role="dialog"
	aria-label="Add a note"
	aria-hidden={!open}
	inert={!open ? true : undefined}
>
	<div class="handle" aria-hidden="true"></div>
	{#if expense}
		<p class="summary">
			<span aria-hidden="true">{emojiFor(expense.category)}</span>
			{expense.category} · {formatIDR(expense.amount)}
		</p>
	{/if}
	<label for="note-text" class="label">Add a note (optional)</label>
	<textarea
		id="note-text"
		bind:this={inputEl}
		bind:value={noteText}
		placeholder="e.g. lunch with team"
		class="input"
	></textarea>
	<div class="actions">
		<button type="button" onclick={() => onSkip()} class="btn-secondary">Skip</button>
		<button type="button" onclick={() => onSave(noteText)} class="btn-primary">Save note</button>
	</div>
</div>

<style>
	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		transform: translateY(100%);
		transition: transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
		background: var(--color-bg);
		border-top-left-radius: 20px;
		border-top-right-radius: 20px;
		box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
		padding: 1.5rem 1rem;
		z-index: 60;
	}
	.sheet.open {
		transform: translateY(0);
	}
	.handle {
		width: 32px;
		height: 4px;
		background: var(--color-surface);
		border-radius: 2px;
		margin: 0 auto 1rem;
	}
	.summary {
		font-size: 20px;
		font-weight: 600;
		color: var(--color-foreground);
		margin-bottom: 1rem;
	}
	.label {
		display: block;
		font-size: 14px;
		color: var(--color-muted);
		margin-bottom: 0.5rem;
	}
	.input {
		width: 100%;
		min-height: 48px;
		border: 1px solid var(--color-surface);
		border-radius: 8px;
		padding: 12px;
		font-size: 16px;
		background: var(--color-bg);
		color: var(--color-foreground);
		resize: none;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.btn-secondary,
	.btn-primary {
		flex: 1;
		min-height: 48px;
		border-radius: 8px;
		font-size: 16px;
		font-weight: 600;
	}
	.btn-secondary {
		border: 1px solid var(--color-surface);
		background: transparent;
		color: var(--color-muted);
	}
	.btn-primary {
		background: var(--color-accent);
		color: var(--color-accent-foreground);
		border: 0;
	}
</style>
