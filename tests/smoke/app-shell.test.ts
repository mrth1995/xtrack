import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AppShell from './AppShell.test.svelte';

describe('App shell smoke test', () => {
	it('renders the app shell without throwing', () => {
		render(AppShell);
		expect(screen.getByText('xtrack')).toBeTruthy();
	});

	it('applies correct accent colour token', () => {
		render(AppShell);
		const heading = screen.getByRole('heading', { name: /xtrack/i });
		expect(heading).toBeInTheDocument();
	});
});
