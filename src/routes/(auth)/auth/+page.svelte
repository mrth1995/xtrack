<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { ActionData } from './$types';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();

	// Default to 'login' tab; switch to 'signup' via the segmented control.
	// Use a separate writable state; on form submission failure the server echoes
	// back the mode so the correct tab stays selected.
	let _userSelectedMode: 'login' | 'signup' | null = $state(null);

	// The effective mode: user pick overrides the echoed server value.
	const mode = $derived(
		_userSelectedMode ??
			((form as { mode?: 'login' | 'signup' } | null)?.mode ?? 'login')
	);

	let showPassword = $state(false);
	let submitting = $state(false);

	function setMode(next: 'login' | 'signup') {
		_userSelectedMode = next;
	}

	const errors = $derived((form as { errors?: Record<string, string> } | null)?.errors ?? {});
	const prefillEmail = $derived((form as { email?: string } | null)?.email ?? '');
	const success = $derived((form as { success?: string } | null)?.success ?? '');
	let authRedirectPending = $state(false);
	let authRedirectError = $state('');

	onMount(() => {
		const hash = window.location.hash.startsWith('#')
			? window.location.hash.slice(1)
			: window.location.hash;
		const params = new URLSearchParams(hash);
		const hasAuthRedirect =
			params.has('access_token') ||
			params.has('refresh_token') ||
			params.has('error') ||
			params.has('error_description');

		if (!hasAuthRedirect) {
			return;
		}

		authRedirectPending = true;

		const clearHash = () => {
			history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
		};

		const finishRedirect = async () => {
			const { supabase } = await import('$lib/supabase/client');
			const errorDescription = params.get('error_description');
			if (errorDescription) {
				authRedirectError = errorDescription;
				authRedirectPending = false;
				clearHash();
				return;
			}

			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (session) {
				clearHash();
				await goto('/', { replaceState: true, invalidateAll: true });
				return;
			}

			authRedirectError = 'Email confirmation finished, but the session was not restored. Please log in manually.';
			authRedirectPending = false;
			clearHash();
		};

		let unsubscribe = () => {};

		void (async () => {
			const { supabase } = await import('$lib/supabase/client');
			const {
				data: { subscription }
			} = supabase.auth.onAuthStateChange((_event, session) => {
				if (session) {
					clearHash();
					void goto('/', { replaceState: true, invalidateAll: true });
				}
			});

			unsubscribe = () => {
				subscription.unsubscribe();
			};

			await finishRedirect();
		})();

		return () => {
			unsubscribe();
		};
	});
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Log in' : 'Sign up'} · xtrack</title>
</svelte:head>

<main
	class="flex min-h-screen flex-col items-center justify-center px-4"
	style="background-color: var(--color-bg);"
>
	<div class="w-full max-w-sm">
		<!-- App wordmark -->
		<h1
			class="mb-2 text-center text-2xl font-semibold tracking-tight"
			style="color: var(--color-accent);"
		>
			xtrack
		</h1>

		<!-- Onboarding framing copy (D-19) -->
		<p class="mb-6 text-center text-sm" style="color: var(--color-muted);">
			Track shared household spending — fast and simple.
		</p>

		<!-- Segmented control: Log in / Sign up (D-14) -->
		<div
			class="mb-6 flex rounded-lg p-1"
			style="background-color: var(--color-surface);"
			role="tablist"
			aria-label="Authentication mode"
		>
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'login'}
				class="flex-1 rounded-md py-2.5 text-sm font-semibold transition-colors"
				style={mode === 'login'
					? 'background-color: var(--color-accent); color: var(--color-accent-foreground);'
					: 'color: var(--color-muted);'}
				onclick={() => setMode('login')}
			>
				Log in
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'signup'}
				class="flex-1 rounded-md py-2.5 text-sm font-semibold transition-colors"
				style={mode === 'signup'
					? 'background-color: var(--color-accent); color: var(--color-accent-foreground);'
					: 'color: var(--color-muted);'}
				onclick={() => setMode('signup')}
			>
				Sign up
			</button>
		</div>

		<!-- Auth form — action driven by current mode -->
		<form
			method="POST"
			action="?/{mode}"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
			class="flex flex-col gap-4"
			novalidate
		>
			{#if authRedirectPending}
				<p
					class="rounded-lg px-4 py-3 text-sm font-medium"
					style="background-color: #DBEAFE; color: #1D4ED8;"
					role="status"
					aria-live="polite"
				>
					Finishing email confirmation...
				</p>
			{/if}

			{#if authRedirectError}
				<p
					class="rounded-lg px-4 py-3 text-sm font-medium"
					style="background-color: #FEE2E2; color: var(--color-destructive);"
					role="alert"
					aria-live="polite"
				>
					{authRedirectError}
				</p>
			{/if}

			{#if success}
				<p
					class="rounded-lg px-4 py-3 text-sm font-medium"
					style="background-color: #DCFCE7; color: #166534;"
					role="status"
					aria-live="polite"
				>
					{success}
				</p>
			{/if}

			<!-- Form-level error (D-18) -->
			{#if errors.form}
				<p
					class="rounded-lg px-4 py-3 text-sm font-medium"
					style="background-color: #FEE2E2; color: var(--color-destructive);"
					role="alert"
					aria-live="polite"
				>
					{errors.form}
				</p>
			{/if}

			<!-- Email field -->
			<div class="flex flex-col gap-1">
				<label class="text-sm font-semibold" style="color: var(--color-foreground);" for="email">
					Email
				</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					inputmode="email"
					value={prefillEmail}
					aria-invalid={!!errors.email}
					aria-describedby={errors.email ? 'email-error' : undefined}
					class="w-full rounded-lg border px-4 text-base outline-none transition-colors focus:ring-2"
					style="height: var(--tap-min); background-color: var(--color-bg);
					       border-color: {errors.email ? 'var(--color-destructive)' : 'var(--color-surface)'};
					       color: var(--color-foreground);
					       --tw-ring-color: var(--color-accent);"
					placeholder="you@example.com"
				/>
				{#if errors.email}
					<p id="email-error" class="text-sm" style="color: var(--color-destructive);">
						{errors.email}
					</p>
				{/if}
			</div>

			<!-- Password field with show/hide toggle (D-17) -->
			<div class="flex flex-col gap-1">
				<label class="text-sm font-semibold" style="color: var(--color-foreground);" for="password">
					Password
				</label>
				<div class="relative">
					<input
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
						aria-invalid={!!errors.password}
						aria-describedby={errors.password ? 'password-error' : undefined}
						class="w-full rounded-lg border px-4 pr-12 text-base outline-none transition-colors focus:ring-2"
						style="height: var(--tap-min); background-color: var(--color-bg);
						       border-color: {errors.password ? 'var(--color-destructive)' : 'var(--color-surface)'};
						       color: var(--color-foreground);
						       --tw-ring-color: var(--color-accent);"
						placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}
					/>
					<!-- Show/hide toggle button -->
					<button
						type="button"
						class="absolute inset-y-0 right-0 flex items-center px-3 text-sm font-medium"
						style="color: var(--color-muted);"
						onclick={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{showPassword ? 'Hide' : 'Show'}
					</button>
				</div>
				{#if errors.password}
					<p id="password-error" class="text-sm" style="color: var(--color-destructive);">
						{errors.password}
					</p>
				{/if}
			</div>

			<!-- Submit button -->
			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
				style="height: var(--button-height); background-color: var(--color-accent); color: var(--color-accent-foreground);"
			>
				{#if submitting}
					{mode === 'login' ? 'Logging in…' : 'Creating account…'}
				{:else}
					{mode === 'login' ? 'Log in' : 'Create account'}
				{/if}
			</button>
		</form>
	</div>
</main>
