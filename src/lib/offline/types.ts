import type { Category } from '$lib/expenses/schemas';

export type SyncStatus = 'queued' | 'syncing' | 'failed';

export interface QueuedExpense {
	client_id: string;
	server_id?: string;
	household_id: string;
	amount: number;
	category: Category;
	note: string | null;
	spent_at: string;
	sync_status: SyncStatus;
	created_at: string;
	updated_at: string;
	sync_started_at: string | null;
	retry_count: number;
	last_error: string | null;
}

export interface ExpenseViewItem {
	id: string;
	client_id: string;
	amount: number;
	category: Category;
	note: string | null;
	spent_at: string;
	sync_status?: SyncStatus;
	sync_error?: string | null;
}

export interface SyncContext {
	householdId: string | null;
	sessionReady: boolean;
	fetcher?: typeof fetch;
	endpoint?: string;
	clientId?: string;
}
