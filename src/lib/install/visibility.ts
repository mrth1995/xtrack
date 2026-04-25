/**
 * Install guidance visibility logic — Phase 1 / Plan 05.
 *
 * Centralises all gating rules so no other code needs to reason about
 * when it is appropriate to show the Safari install guidance banner:
 *
 *   1. Auth required   — only show after the user has successfully signed in.
 *   2. Safari required — detect iOS Safari via userAgent or the UA string.
 *   3. Not standalone  — never show when the app is already running from the
 *                        Home Screen (navigator.standalone === true on iOS,
 *                        matchMedia('display-mode: standalone') on Android).
 *   4. Snooze window   — if the user dismissed the banner, honour a snooze
 *                        period before showing it again (default 24 h).
 *
 * D-33: do not show on first paint.
 * D-34: show only after successful auth.
 * D-35: non-blocking banner, not a modal.
 * D-36: dismissal snoozes rather than permanently hiding.
 * D-37: banner can reappear after snooze on a later Safari visit.
 * D-38: copy focuses on direct instruction.
 * D-39: never show in standalone mode.
 */

const SNOOZE_KEY = 'xtrack_install_snoozed_until';
const DEFAULT_SNOOZE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Returns true if the current browser context is iOS Safari or a
 * WebKit-based browser that supports "Add to Home Screen".
 *
 * Detection approach:
 *  - navigator.userAgent contains 'Safari' but not 'CriOS' (Chrome on iOS)
 *    and not 'FxiOS' (Firefox on iOS).
 *  - Also checking for iPhone/iPad in the UA to restrict to iOS.
 */
export function isSafariBrowser(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent;
	const isIOS = /iPhone|iPad|iPod/.test(ua);
	const isSafari = /Safari/.test(ua);
	const isChromeiOS = /CriOS/.test(ua);
	const isFirefoxiOS = /FxiOS/.test(ua);
	return isIOS && isSafari && !isChromeiOS && !isFirefoxiOS;
}

/**
 * Returns true when the app is running in standalone (installed) mode.
 *
 * iOS:     navigator.standalone === true
 * Android: window.matchMedia('(display-mode: standalone)').matches
 */
export function isStandalone(): boolean {
	if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
	// iOS standalone check (non-standard but widely supported on iOS Safari)
	if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) {
		return true;
	}
	// W3C display-mode check (works for Chrome/Android PWA installs)
	if (typeof window.matchMedia === 'function') {
		return window.matchMedia('(display-mode: standalone)').matches;
	}
	return false;
}

/**
 * Returns true if the install guidance banner is currently snoozed.
 * Reads the snooze expiry timestamp from localStorage.
 */
export function isInstallGuidanceSnoozed(): boolean {
	if (typeof localStorage === 'undefined') return false;
	const raw = localStorage.getItem(SNOOZE_KEY);
	if (!raw) return false;
	const snoozedUntil = parseInt(raw, 10);
	if (isNaN(snoozedUntil)) return false;
	return Date.now() < snoozedUntil;
}

/**
 * Stores a snooze expiry in localStorage, preventing the banner from
 * appearing again until the snooze window passes.
 *
 * @param durationMs How long to snooze (default 24 h).
 */
export function snoozeInstallGuidance(durationMs: number = DEFAULT_SNOOZE_MS): void {
	if (typeof localStorage === 'undefined') return;
	const until = Date.now() + durationMs;
	localStorage.setItem(SNOOZE_KEY, String(until));
}

/**
 * Clears the snooze so the banner can appear again on the next qualifying visit.
 * Useful in tests.
 */
export function clearInstallGuidanceSnooze(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(SNOOZE_KEY);
}

/**
 * Master gate: returns true only when ALL conditions are met:
 *  - `isAuthenticated` is true (caller passes this from server-loaded user)
 *  - The browser is Safari / iOS installable context
 *  - The app is NOT already running in standalone mode
 *  - The snooze window has expired (or was never set)
 *
 * @param isAuthenticated Whether the user is currently signed in.
 */
export function shouldShowInstallGuidance(isAuthenticated: boolean): boolean {
	if (!isAuthenticated) return false;
	if (!isSafariBrowser()) return false;
	if (isStandalone()) return false;
	if (isInstallGuidanceSnoozed()) return false;
	return true;
}
