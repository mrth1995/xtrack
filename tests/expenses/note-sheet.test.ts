import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

describe('NoteSheet component (INPUT-14)', () => {
	it('renders the post-save expense summary when open', async () => {
		const { default: NoteSheet } = await import('$lib/components/NoteSheet.svelte');
		const { getByRole, getByText, getByLabelText } = render(NoteSheet, {
			open: true,
			expense: { id: 'exp-1', category: 'Food', amount: 54000 },
			onSkip: vi.fn(),
			onSave: vi.fn()
		});

		const dialog = getByRole('dialog', { name: 'Add a note' });

		expect(dialog).toHaveClass('open');
		expect(dialog).toHaveAttribute('aria-hidden', 'false');
		expect(getByText(/Food · Rp 54\.000/)).toBeInTheDocument();
		expect(getByLabelText('Add a note (optional)')).toBeInTheDocument();
	});

	it('calls onSkip when Skip is tapped', async () => {
		const { default: NoteSheet } = await import('$lib/components/NoteSheet.svelte');
		const onSkip = vi.fn();
		const onSave = vi.fn();
		const { getByRole } = render(NoteSheet, {
			open: true,
			expense: { id: 'exp-1', category: 'Food', amount: 54000 },
			onSkip,
			onSave
		});

		await fireEvent.click(getByRole('button', { name: 'Skip' }));

		expect(onSkip).toHaveBeenCalledOnce();
		expect(onSave).not.toHaveBeenCalled();
	});

	it('calls onSave with the typed note when Save note is tapped', async () => {
		const { default: NoteSheet } = await import('$lib/components/NoteSheet.svelte');
		const onSkip = vi.fn();
		const onSave = vi.fn();
		const { getByRole, getByLabelText } = render(NoteSheet, {
			open: true,
			expense: { id: 'exp-1', category: 'Food', amount: 54000 },
			onSkip,
			onSave
		});

		await fireEvent.input(getByLabelText('Add a note (optional)'), {
			target: { value: 'lunch with team' }
		});
		await fireEvent.click(getByRole('button', { name: 'Save note' }));

		expect(onSave).toHaveBeenCalledWith('lunch with team');
		expect(onSkip).not.toHaveBeenCalled();
	});
});
