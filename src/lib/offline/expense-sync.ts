import type { QueuedExpense, SyncContext } from './types';
import {
	attachServerIdAndRemove,
	getQueuedExpenses,
	markQueuedExpenseFailed,
	markQueuedExpenseSyncing,
	recoverStaleSyncingExpenses,
	updateQueuedExpense
} from './expense-queue';

export type SyncErrorKind =
	| 'network'
	| 'auth'
	| 'household_access'
	| 'household_mismatch'
	| 'unknown';

export interface FlushExpenseQueueResult {
	attempted: number;
	synced: number;
	failed: number;
	paused: boolean;
}

interface ActionFailurePayload {
	error?: string;
	message?: string;
	syncErrorCode?: SyncErrorKind;
	data?: ActionFailurePayload;
}

const ACCESS_FAILURES = [
	{ syncErrorCode: 'auth', message: 'Sign in again to sync this expense.' },
	{ syncErrorCode: 'household_access', message: 'Check household access before retrying.' },
	{ syncErrorCode: 'household_mismatch', message: 'This expense belongs to a different household.' }
] as const;

const ACCESS_FAILURE_MESSAGES = Object.fromEntries(
	ACCESS_FAILURES.map((failure) => [failure.syncErrorCode, failure.message])
) as Record<Exclude<SyncErrorKind, 'network' | 'unknown'>, string>;

function isBrowserOffline(): boolean {
	return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function isNetworkError(error: unknown): boolean {
	return (
		error instanceof TypeError ||
		(error instanceof DOMException && error.name === 'AbortError') ||
		isBrowserOffline()
	);
}

function asPayload(value: unknown): ActionFailurePayload {
	if (!value || typeof value !== 'object') {
		return {};
	}

	const payload = value as ActionFailurePayload;
	return payload.data && typeof payload.data === 'object' ? { ...payload, ...payload.data } : payload;
}

function syncErrorMessage(kind: SyncErrorKind, payload: ActionFailurePayload): string {
	if (kind === 'auth' || kind === 'household_access' || kind === 'household_mismatch') {
		return ACCESS_FAILURE_MESSAGES[kind];
	}

	return payload.error ?? payload.message ?? 'Could not sync expense.';
}

export function classifySyncError(error: unknown): SyncErrorKind {
	if (isNetworkError(error)) {
		return 'network';
	}

	const payload = asPayload(error);
	if (payload.syncErrorCode === 'auth') {
		return 'auth';
	}
	if (payload.syncErrorCode === 'household_access') {
		return 'household_access';
	}
	if (payload.syncErrorCode === 'household_mismatch') {
		return 'household_mismatch';
	}

	return 'unknown';
}

function createRequestBody(row: QueuedExpense): URLSearchParams {
	const formData = new FormData();
	formData.set('amount', String(row.amount));
	formData.set('category', row.category);
	formData.set('client_id', row.client_id);
	formData.set('spent_at', row.spent_at);
	formData.set('household_id', row.household_id);
	formData.set('note', row.note ?? '');
	formData.set('sync_mode', 'offline');

	const body = new URLSearchParams();
	for (const [key, value] of formData.entries()) {
		body.set(key, String(value));
	}

	return body;
}

async function parseActionResponse(response: Response): Promise<ActionFailurePayload> {
	try {
		return asPayload(await response.json());
	} catch {
		return {
			syncErrorCode: 'network',
			error: 'Could not read sync response.'
		};
	}
}

function serverIdFromPayload(payload: ActionFailurePayload): string | null {
	const source = payload.data && typeof payload.data === 'object' ? payload.data : payload;
	const maybeExpense = (source as { expense?: { id?: unknown } }).expense;
	const maybeId = maybeExpense?.id ?? (source as { id?: unknown }).id;

	return typeof maybeId === 'string' ? maybeId : null;
}

async function syncExpense(row: QueuedExpense, context: Required<Pick<SyncContext, 'fetcher' | 'endpoint'>>) {
	const response = await context.fetcher(context.endpoint, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: createRequestBody(row)
	});
	const payload = await parseActionResponse(response);

	if (!response.ok) {
		throw payload;
	}

	const serverId = serverIdFromPayload(payload);
	if (!serverId) {
		throw { syncErrorCode: 'unknown', error: 'Could not sync expense.' };
	}

	return serverId;
}

export async function flushExpenseQueue(
	context: SyncContext
): Promise<FlushExpenseQueueResult> {
	if (!context.sessionReady || !context.householdId) {
		return { attempted: 0, synced: 0, failed: 0, paused: true };
	}

	await recoverStaleSyncingExpenses(Date.now());

	const endpoint = context.endpoint ?? '/?/saveExpense';
	const fetcher = context.fetcher ?? fetch;
	const rows = (await getQueuedExpenses()).filter(
		(row) => row.sync_status === 'queued' || row.sync_status === 'failed'
	);
	let attempted = 0;
	let synced = 0;
	let failed = 0;

	for (const row of rows) {
		if (context.clientId && row.client_id !== context.clientId) {
			continue;
		}

		if (row.household_id !== context.householdId) {
			await markQueuedExpenseFailed(row.client_id, ACCESS_FAILURE_MESSAGES.household_mismatch);
			failed += 1;
			continue;
		}

		attempted += 1;
		await markQueuedExpenseSyncing(row.client_id);

		if (isBrowserOffline()) {
			await updateQueuedExpense(row.client_id, {
				sync_status: 'queued',
				sync_started_at: null,
				last_error: null
			});
			continue;
		}

		try {
			const serverId = await syncExpense(row, { fetcher, endpoint });
			await attachServerIdAndRemove(row.client_id, serverId);
			synced += 1;
		} catch (error) {
			const payload = asPayload(error);
			const kind = classifySyncError(error);

			if (kind === 'network') {
				await updateQueuedExpense(row.client_id, {
					sync_status: 'queued',
					sync_started_at: null,
					last_error: null
				});
				continue;
			}

			await markQueuedExpenseFailed(row.client_id, syncErrorMessage(kind, payload));
			failed += 1;
		}
	}

	return { attempted, synced, failed, paused: false };
}

export function installExpenseSyncTriggers(
	contextFactory: () => SyncContext,
	flush: (context: SyncContext) => Promise<FlushExpenseQueueResult> = flushExpenseQueue
): () => void {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return () => {};
	}

	const flushCurrentContext = () => {
		void flush(contextFactory());
	};
	const flushWhenVisible = () => {
		if (document.visibilityState === 'visible') {
			flushCurrentContext();
		}
	};

	window.addEventListener('online', flushCurrentContext);
	document.addEventListener('visibilitychange', flushWhenVisible);

	return () => {
		window.removeEventListener('online', flushCurrentContext);
		document.removeEventListener('visibilitychange', flushWhenVisible);
	};
}
