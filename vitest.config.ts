import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		// Force Vite to resolve the browser (client-side) Svelte build.
		// Without this, Vitest resolves svelte via the "default" condition
		// which points to index-server.js, causing mount() to fail in jsdom.
		conditions: ['browser'],
		alias: {
<<<<<<< HEAD
			// Mirror the $lib alias that SvelteKit injects at dev/build time.
			// Required for unit tests that import $lib/* directly.
=======
			// Resolve SvelteKit path aliases for test files
>>>>>>> worktree-agent-a7f00084972a30c75
			$lib: path.resolve('./src/lib')
		}
	},
	test: {
		include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['tests/setup.ts'],
		globals: true
	}
});
