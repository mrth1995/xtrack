/**
 * Expense display formatters for xtrack Phase 2.
 *
 * IDR uses integer amounts (no sub-rupiah). All formatting uses
 * Intl.NumberFormat via toLocaleString('id-ID') — dot as thousands separator.
 *
 * Date helpers convert between Supabase timestamptz (UTC ISO) and the HTML
 * <input type="date"> value (YYYY-MM-DD local date in WIB / Asia/Jakarta).
 */

/** Full IDR format with "Rp " prefix — for expense list rows */
export function formatIDR(amount: number): string {
	return 'Rp ' + amount.toLocaleString('id-ID');
}

/** Numpad display format — no prefix, dot separator only */
export function formatNumpad(amountStr: string): string {
	if (!amountStr || amountStr === '0') return '0';
	return parseInt(amountStr, 10).toLocaleString('id-ID');
}

/** Date display — id-ID locale, short month (e.g. "26 Apr"), pinned to WIB.
 *
 * Codex Cycle 3 MEDIUM: Must pin timeZone: 'Asia/Jakarta' so history date labels
 * always reflect the WIB calendar day, not the runtime/browser timezone.
 * Without this, an expense logged at 2026-04-26T22:30:00Z (= 05:30 WIB Apr 27)
 * would show "26 Apr" label on a UTC browser but "27 Apr" label on a WIB browser
 * — creating off-by-one date headers near UTC midnight for non-WIB environments
 * and inconsistent grouping against toDateInputValue (which correctly pins WIB).
 */
export function formatDisplayDate(timestamptz: string): string {
	return new Date(timestamptz).toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'short',
		timeZone: 'Asia/Jakarta'
	});
}

/** Date input value — YYYY-MM-DD in WIB timezone (for <input type="date">) */
export function toDateInputValue(timestamptz: string): string {
	return new Date(timestamptz).toLocaleDateString('en-CA', {
		timeZone: 'Asia/Jakarta'
	});
}

/** Convert date input YYYY-MM-DD back to UTC ISO string (treats input as WIB midnight) */
export function fromDateInputValue(dateStr: string): string {
	return new Date(dateStr + 'T00:00:00+07:00').toISOString();
}
