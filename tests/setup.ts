import '@testing-library/jest-dom';

// ── matchMedia mock ───────────────────────────────────────────────────────────
// jsdom does not implement matchMedia; Svelte media queries need this stub.
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string): MediaQueryList => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false
	})
});

// ── localStorage mock ─────────────────────────────────────────────────────────
// jsdom provides localStorage, but redefine here to ensure it is writable in
// test contexts where some environments restrict it.
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
	getItem: (key: string) => localStorageStore[key] ?? null,
	setItem: (key: string, value: string) => {
		localStorageStore[key] = value;
	},
	removeItem: (key: string) => {
		delete localStorageStore[key];
	},
	clear: () => {
		Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
	},
	get length() {
		return Object.keys(localStorageStore).length;
	},
	key: (index: number) => Object.keys(localStorageStore)[index] ?? null
};

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
	writable: true
});

// ── navigator.standalone placeholder ─────────────────────────────────────────
// iOS sets navigator.standalone = true when the app is launched from the Home
// Screen. jsdom does not expose this property; stub it for unit tests.
if (!('standalone' in navigator)) {
	Object.defineProperty(navigator, 'standalone', {
		get: () => false,
		configurable: true
	});
}
