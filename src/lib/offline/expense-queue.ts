import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Category } from '$lib/expenses/schemas';
import type { QueuedExpense } from './types';

const DB_NAME = 'xtrack-offline';
const DB_VERSION = 1;
const STORE_NAME = 'queued-expenses';
export const STUCK_SYNCING_MS = 5 * 60 * 1000;

interface ExpenseQueueDb extends DBSchema {
	'queued-expenses': {
		key: string;
		value: QueuedExpense;
		indexes: {
			by_status: QueuedExpense['sync_status'];
			by_household: string;
			by_spent_at: string;
		};
	};
}

interface QueueExpenseInput {
	client_id: string;
	household_id: string;
	amount: number;
	category: Category;
	note: string | null;
	spent_at: string;
}

type QueueUpdate = Partial<
	Pick<
		QueuedExpense,
		| 'server_id'
		| 'household_id'
		| 'amount'
		| 'category'
		| 'note'
		| 'spent_at'
		| 'sync_status'
		| 'sync_started_at'
		| 'retry_count'
		| 'last_error'
	>
>;

let dbPromise: Promise<IDBPDatabase<ExpenseQueueDb>> | null = null;

function isIndexedDbAvailable(): boolean {
	return typeof indexedDB !== 'undefined';
}

function nowIso(): string {
	return new Date().toISOString();
}

function getDb(): Promise<IDBPDatabase<ExpenseQueueDb>> | null {
	if (!isIndexedDbAvailable()) {
		return null;
	}

	dbPromise ??= openDB<ExpenseQueueDb>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'client_id' });
				store.createIndex('by_status', 'sync_status');
				store.createIndex('by_household', 'household_id');
				store.createIndex('by_spent_at', 'spent_at');
			}
		}
	});

	return dbPromise;
}

export async function queueExpense(input: QueueExpenseInput): Promise<QueuedExpense> {
	const timestamp = nowIso();
	const existing = await getQueuedExpense(input.client_id);
	const queued: QueuedExpense = {
		...input,
		sync_status: 'queued',
		created_at: existing?.created_at ?? timestamp,
		updated_at: timestamp,
		sync_started_at: null,
		retry_count: existing?.retry_count ?? 0,
		last_error: null
	};
	if (existing?.server_id) {
		queued.server_id = existing.server_id;
	}

	const db = await getDb();
	if (db) {
		await db.put(STORE_NAME, queued);
	}

	return queued;
}

export async function getQueuedExpense(clientId: string): Promise<QueuedExpense | undefined> {
	const db = await getDb();
	if (!db) {
		return undefined;
	}

	return db.get(STORE_NAME, clientId);
}

export async function getQueuedExpenses(): Promise<QueuedExpense[]> {
	const db = await getDb();
	if (!db) {
		return [];
	}

	const rows = await db.getAll(STORE_NAME);
	return rows.sort((a, b) => b.spent_at.localeCompare(a.spent_at));
}

export async function updateQueuedExpense(
	clientId: string,
	update: QueueUpdate
): Promise<QueuedExpense | undefined> {
	const existing = await getQueuedExpense(clientId);
	if (!existing) {
		return undefined;
	}

	const timestamp = nowIso();
	const nextStatus =
		update.sync_status ?? (existing.sync_status === 'failed' ? 'queued' : existing.sync_status);
	const next: QueuedExpense = {
		...existing,
		...update,
		sync_status: nextStatus,
		sync_started_at: nextStatus === 'queued' ? null : (update.sync_started_at ?? existing.sync_started_at),
		last_error: nextStatus === 'queued' ? null : (update.last_error ?? existing.last_error),
		updated_at: timestamp
	};

	const db = await getDb();
	if (db) {
		await db.put(STORE_NAME, next);
	}

	return next;
}

export async function deleteQueuedExpense(clientId: string): Promise<void> {
	const db = await getDb();
	if (!db) {
		return;
	}

	await db.delete(STORE_NAME, clientId);
}

export async function markQueuedExpenseSyncing(
	clientId: string,
	startedAt = nowIso()
): Promise<QueuedExpense | undefined> {
	const existing = await getQueuedExpense(clientId);
	return updateQueuedExpense(clientId, {
		sync_status: 'syncing',
		sync_started_at: startedAt,
		retry_count: existing ? existing.retry_count + 1 : 1
	});
}

export async function markQueuedExpenseFailed(
	clientId: string,
	error: string
): Promise<QueuedExpense | undefined> {
	return updateQueuedExpense(clientId, {
		sync_status: 'failed',
		sync_started_at: null,
		last_error: error
	});
}

export async function attachServerIdAndRemove(clientId: string, serverId: string): Promise<void> {
	await updateQueuedExpense(clientId, { server_id: serverId });
	await deleteQueuedExpense(clientId);
}

export async function recoverStaleSyncingExpenses(now: number = Date.now()): Promise<string[]> {
	const db = await getDb();
	if (!db) {
		return [];
	}

	const rows = await db.getAllFromIndex(STORE_NAME, 'by_status', 'syncing');
	const staleClientIds: string[] = [];

	await Promise.all(
		rows.map(async (row) => {
			if (!row.sync_started_at) {
				return;
			}

			const startedAt = Date.parse(row.sync_started_at);
			if (Number.isNaN(startedAt) || now - startedAt <= STUCK_SYNCING_MS) {
				return;
			}

			staleClientIds.push(row.client_id);
			await updateQueuedExpense(row.client_id, {
				sync_status: 'queued',
				sync_started_at: null,
				last_error: null
			});
		})
	);

	return staleClientIds;
}

export async function clearExpenseQueueForTests(): Promise<void> {
	const db = await getDb();
	if (!db) {
		return;
	}

	await db.clear(STORE_NAME);
}
