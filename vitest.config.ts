import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		// Force Vite to resolve the browser (client-side) Svelte build.
		// Without this, Vitest resolves svelte via the "default" condition
		// which points to index-server.js, causing mount() to fail in jsdom.
		conditions: ['browser']
	},
	test: {
		include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['tests/setup.ts'],
		globals: true
	}
});
