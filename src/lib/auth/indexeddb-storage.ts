/**
 * IndexedDB-backed Supabase auth storage adapter.
 *
 * Provides the Supabase storage contract (getItem / setItem / removeItem)
 * using IndexedDB for durable cross-context persistence. This is required for
 * iOS PWA (standalone) mode where the Safari cookie jar and the installed-app
 * container are isolated; localStorage is similarly isolated, so IndexedDB is
 * the only reliable store that survives the handoff from Safari to Home Screen.
 *
 * Falls back to localStorage when IndexedDB is unavailable (non-browser
 * environments such as SSR or test environments that lack IDB support) so the
 * module does not crash in those contexts.
 *
 * Database:  xtrack-auth
 * Store:     supabase-session
 * Record shape: { key: string; value: string }
 */

const DB_NAME = 'xtrack-auth';
const STORE_NAME = 'supabase-session';
const DB_VERSION = 1;

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'key' });
			}
		};

		request.onsuccess = (event) => {
			resolve((event.target as IDBOpenDBRequest).result);
		};

		request.onerror = (event) => {
			reject((event.target as IDBOpenDBRequest).error);
		};
	});
}

async function idbGet(key: string): Promise<string | null> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const request = store.get(key);

		request.onsuccess = (event) => {
			const result = (event.target as IDBRequest).result as { key: string; value: string } | undefined;
			resolve(result?.value ?? null);
		};

		request.onerror = (event) => {
			reject((event.target as IDBRequest).error);
		};
	});
}

async function idbSet(key: string, value: string): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const request = store.put({ key, value });

		request.onsuccess = () => resolve();
		request.onerror = (event) => reject((event.target as IDBRequest).error);
	});
}

async function idbRemove(key: string): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const request = store.delete(key);

		request.onsuccess = () => resolve();
		request.onerror = (event) => reject((event.target as IDBRequest).error);
	});
}

// ---------------------------------------------------------------------------
// Supabase storage contract implementation
// ---------------------------------------------------------------------------

/**
 * Whether IndexedDB is available in the current context.
 * SSR (Node.js), some test environments, and very old browsers lack indexedDB.
 */
function isIdbAvailable(): boolean {
	return typeof indexedDB !== 'undefined';
}

export const indexedDbSessionStorage = {
	async getItem(key: string): Promise<string | null> {
		if (!isIdbAvailable()) {
			return localStorage.getItem(key);
		}
		try {
			return await idbGet(key);
		} catch {
			// Graceful degradation: fall back to localStorage on IDB errors
			return localStorage.getItem(key);
		}
	},

	async setItem(key: string, value: string): Promise<void> {
		if (!isIdbAvailable()) {
			localStorage.setItem(key, value);
			return;
		}
		try {
			await idbSet(key, value);
		} catch {
			localStorage.setItem(key, value);
		}
	},

	async removeItem(key: string): Promise<void> {
		if (!isIdbAvailable()) {
			localStorage.removeItem(key);
			return;
		}
		try {
			await idbRemove(key);
		} catch {
			localStorage.removeItem(key);
		}
	}
};
