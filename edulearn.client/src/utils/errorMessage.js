// Turns any error (axios error, plain Error, or string) into a user-facing
// model. Never exposes status codes or API routes. Used by ErrorAlert,
// AccessDeniedPage, and the crash page so wording stays consistent.

const ROUTE_PATTERN = /\/api\//i;
const METHOD_PATTERN = /^(GET|POST|PUT|PATCH|DELETE)\s+\//i;

// Strip anything that looks like an internal route/path so it never reaches the user.
function sanitize(text, fallback) {
    if (!text || typeof text !== 'string') return fallback;
    if (ROUTE_PATTERN.test(text) || METHOD_PATTERN.test(text)) return fallback;
    return text;
}

export function getFriendlyError(error) {
    // Plain string
    if (typeof error === 'string') {
        return { category: 'unknown', title: 'Something went wrong',
            message: sanitize(error, 'An unexpected problem occurred.'),
            guidance: 'Please try again. If it keeps happening, contact your department admin.' };
    }
    if (!error) {
        return { category: 'unknown', title: 'Something went wrong',
            message: 'An unexpected problem occurred.',
            guidance: 'Please try again.' };
    }

    // Network / timeout — axiosClient sets _userMessage for these.
    if (error._userMessage || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response) {
        return { category: 'network', title: 'Connection problem',
            message: "We couldn't reach the server.",
            guidance: 'Check your internet connection and try again in a moment.' };
    }

    const status = error.response?.status;

    if (status >= 500) {
        return { category: 'server', title: 'Something went wrong',
            message: 'An unexpected problem occurred on our side.',
            guidance: 'Please try again in a few minutes. If it keeps happening, contact your department admin.' };
    }
    if (status === 403) {
        return { category: 'forbidden', title: 'Access denied',
            message: "Your account doesn't have access to this.",
            guidance: 'If you think this is a mistake, contact your department admin.' };
    }
    if (status === 404) {
        return { category: 'notFound', title: 'Not found',
            message: "We couldn't find what you were looking for.",
            guidance: 'It may have been moved or removed.' };
    }
    if (status === 400 || status === 409 || status === 422) {
        // The API returns a clean { error } message for these — show it, sanitized.
        const apiMsg = error.response?.data?.error;
        return { category: 'validation', title: 'Please check your input',
            message: sanitize(apiMsg, "We couldn't process that request."),
            guidance: '' };
    }
    if (status === 401) {
        return { category: 'unknown', title: 'Sign-in required',
            message: sanitize(error.response?.data?.error, 'Please sign in to continue.'),
            guidance: '' };
    }

    // Final fallback. IMPORTANT: never use error.message here — axios sets it to
    // "Request failed with status code NNN", which leaks the status code to the
    // user. Only use a clean backend { error } string (sanitized), else generic.
    return { category: 'unknown', title: 'Something went wrong',
        message: sanitize(error.response?.data?.error, 'An unexpected problem occurred.'),
        guidance: 'Please try again. If it keeps happening, contact your department admin.' };
}

// String-returning sibling of getFriendlyError, for places that show a simple
// one-line status message (e.g. a toast) instead of the full ErrorAlert card.
// Reuses the exact same status mapping + sanitization so routes and status codes
// can never reach the user. `fallback` lets callers supply an action-specific
// default (e.g. "Failed to generate transcript.").
export function getFriendlySimpleMessage(error, fallback = 'Something went wrong. Please try again.') {
    const { message } = getFriendlyError(error);
    return message || fallback;
}
