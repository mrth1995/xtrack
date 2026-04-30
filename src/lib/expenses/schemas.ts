import { z } from 'zod';

/**
 * Canonical 7-preset category list per D-13 (CONTEXT.md).
 * Order matches the home-screen 3x3-1 grid layout (D-12):
 *   Row 1: Food, Transport, Entertainment
 *   Row 2: Utilities, Shopping, Health
 *   Row 3: Others
 */
export const VALID_CATEGORIES = [
	'Food',
	'Transport',
	'Entertainment',
	'Utilities',
	'Shopping',
	'Health',
	'Others'
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];

/** Insert payload for the saveExpense action (numpad save flow). */
export const saveExpenseSchema = z.object({
	amount: z
		.number()
		.int('Amount must be a whole number')
		.positive('Amount must be greater than 0')
		.max(99_999_999, 'Amount exceeds the maximum (Rp 99.999.999)'),
	category: z.enum(VALID_CATEGORIES, {
		message: 'Invalid category'
	}),
	client_id: z.string().uuid('Invalid client_id (must be a UUID)'),
	spent_at: z.string().datetime('spent_at must be an ISO 8601 datetime')
});

/** PATCH payload for the saveNote action (post-save bottom sheet). */
export const saveNoteSchema = z.object({
	expense_id: z.string().uuid('Invalid expense_id'),
	note: z.string().max(500, 'Note must be 500 characters or fewer').optional()
});

/** UPDATE payload for the saveEdit action (/expenses/[id]/edit form). */
export const editExpenseSchema = z.object({
	amount: z
		.number()
		.int('Amount must be a whole number')
		.positive('Amount must be greater than 0')
		.max(99_999_999, 'Amount exceeds the maximum (Rp 99.999.999)'),
	category: z.enum(VALID_CATEGORIES, {
		message: 'Invalid category'
	}),
	note: z.string().max(500, 'Note must be 500 characters or fewer').nullable(),
	spent_at: z.string().datetime('spent_at must be an ISO 8601 datetime')
});

export type SaveExpenseInput = z.infer<typeof saveExpenseSchema>;
export type SaveNoteInput = z.infer<typeof saveNoteSchema>;
export type EditExpenseInput = z.infer<typeof editExpenseSchema>;

/**
 * Display metadata for each category — emojis per D-13.
 * Used by CategoryGrid (P02) and ExpenseList row prefix.
 */
export const CATEGORY_META: Record<Category, { emoji: string }> = {
	Food: { emoji: '🍜' },
	Transport: { emoji: '🚗' },
	Entertainment: { emoji: '🎬' },
	Utilities: { emoji: '💡' },
	Shopping: { emoji: '🛍️' },
	Health: { emoji: '❤️' },
	Others: { emoji: '✅' }
};
