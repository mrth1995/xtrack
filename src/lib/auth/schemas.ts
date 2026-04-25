/**
 * Auth form validation schemas.
 *
 * Validates email and password inputs from the combined login/sign-up screen
 * before they are sent to Supabase. Kept simple — Supabase's own auth layer
 * is the authoritative validator; these checks exist to catch obvious mistakes
 * and provide immediate inline feedback.
 */

export interface AuthFormErrors {
	email?: string;
	password?: string;
	form?: string;
}

export interface AuthFormValues {
	email: string;
	password: string;
}

/**
 * Validate an email address.
 * Returns an error string or undefined if valid.
 */
export function validateEmail(email: string): string | undefined {
	if (!email || email.trim().length === 0) {
		return 'Email is required.';
	}
	// RFC-5321 practical check: must contain @ and at least one dot after @
	const atIndex = email.indexOf('@');
	if (atIndex < 1) {
		return 'Enter a valid email address.';
	}
	const domain = email.slice(atIndex + 1);
	if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
		return 'Enter a valid email address.';
	}
	return undefined;
}

/**
 * Validate a password.
 * Minimum 8 characters — deliberately lenient; Supabase may impose stricter rules.
 * Returns an error string or undefined if valid.
 */
export function validatePassword(password: string): string | undefined {
	if (!password || password.length === 0) {
		return 'Password is required.';
	}
	if (password.length < 8) {
		return 'Password must be at least 8 characters.';
	}
	return undefined;
}

/**
 * Validate the full login or sign-up form.
 * Returns an errors object; if all fields are empty the errors object is empty.
 */
export function validateAuthForm(values: AuthFormValues): AuthFormErrors {
	const errors: AuthFormErrors = {};
	const emailError = validateEmail(values.email);
	if (emailError) errors.email = emailError;
	const passwordError = validatePassword(values.password);
	if (passwordError) errors.password = passwordError;
	return errors;
}
