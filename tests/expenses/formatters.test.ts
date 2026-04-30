import { describe, it, expect } from 'vitest';
import {
	formatIDR,
	formatNumpad,
	formatDisplayDate,
	toDateInputValue,
	fromDateInputValue
} from '$lib/expenses/formatters';

describe('formatIDR', () => {
	it('formats 54000 as "Rp 54.000"', () => {
		expect(formatIDR(54000)).toBe('Rp 54.000');
	});
	it('formats 0 as "Rp 0"', () => {
		expect(formatIDR(0)).toBe('Rp 0');
	});
	it('formats max amount 99_999_999 as "Rp 99.999.999"', () => {
		expect(formatIDR(99_999_999)).toBe('Rp 99.999.999');
	});
});

describe('formatNumpad', () => {
	it('returns "0" for empty string', () => {
		expect(formatNumpad('')).toBe('0');
	});
	it('returns "0" for "0"', () => {
		expect(formatNumpad('0')).toBe('0');
	});
	it('returns "54.000" for "54000"', () => {
		expect(formatNumpad('54000')).toBe('54.000');
	});
	it('returns "123" for "123"', () => {
		expect(formatNumpad('123')).toBe('123');
	});
});

describe('formatDisplayDate', () => {
	it('formats UTC midday timestamp in id-ID short-month format', () => {
		// 2026-04-26 12:00 UTC = 19:00 WIB same day
		expect(formatDisplayDate('2026-04-26T12:00:00Z')).toMatch(/^26 Apr$/);
	});
	it('returns WIB calendar day for a timestamp that crosses UTC/WIB midnight (Codex Cycle 3 MEDIUM)', () => {
		// 2026-04-26T22:30:00Z = 2026-04-27 05:30 WIB — must display "27 Apr", not "26 Apr".
		// Without timeZone: 'Asia/Jakarta', a UTC-running environment would return "26 Apr".
		expect(formatDisplayDate('2026-04-26T22:30:00Z')).toMatch(/^27 Apr$/);
	});
});

describe('toDateInputValue (UTC -> WIB YYYY-MM-DD)', () => {
	it('returns same calendar day for WIB-evening timestamp', () => {
		// 15:30 UTC = 22:30 WIB on 2026-04-26
		expect(toDateInputValue('2026-04-26T15:30:00Z')).toBe('2026-04-26');
	});
	it('rolls forward one day for late-UTC / early-WIB timestamp', () => {
		// 22:00 UTC = 05:00 WIB next day
		expect(toDateInputValue('2026-04-26T22:00:00Z')).toBe('2026-04-27');
	});
});

describe('fromDateInputValue (YYYY-MM-DD WIB midnight -> UTC ISO)', () => {
	it('returns 17:00 UTC of previous day for WIB midnight', () => {
		expect(fromDateInputValue('2026-04-26')).toBe('2026-04-25T17:00:00.000Z');
	});
});

describe('round-trip', () => {
	it('toDateInputValue(fromDateInputValue(d)) === d', () => {
		expect(toDateInputValue(fromDateInputValue('2026-04-26'))).toBe('2026-04-26');
	});
});
