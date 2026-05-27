// ──────────────────────────────────────────────────────────────────────────────
// validators.js  — EduLearn shared form-validation utilities
//
// Every function returns null (valid) or an error string.
// Callers bind the result to a per-field errors state entry.
// ──────────────────────────────────────────────────────────────────────────────

/** Phone: exactly 10 consecutive digits — no spaces, dashes, plus, brackets, dots. */
export const validatePhone = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return null; // optional field — callers that need required call validatePhoneRequired
    if (!/^\d{10}$/.test(t))
        return 'Phone must be exactly 10 digits — no spaces, dashes, or symbols (e.g. 9876543210)';
    return null;
};

export const validatePhoneRequired = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Phone number is required';
    return validatePhone(v);
};

/** Email: proper format, no double-dots, trimmed + lowercased. */
export const validateEmail = (v) => {
    const t = String(v ?? '').trim().toLowerCase();
    if (!t) return 'Email is required';
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(t))
        return 'Enter a valid email address (e.g. user@example.com)';
    if (/\.{2,}/.test(t)) return 'Email cannot contain consecutive dots';
    if (t.startsWith('.') || t.includes('@.') || t.endsWith('.'))
        return 'Invalid email format';
    return null;
};

/** Username: 3–50 chars, only letters/digits/underscores, starts with alphanumeric. */
export const validateUsername = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Username is required';
    if (t.length < 3) return 'Username must be at least 3 characters';
    if (t.length > 50) return 'Username cannot exceed 50 characters';
    if (!/^[a-zA-Z0-9]/.test(t)) return 'Username must start with a letter or digit';
    if (!/^[a-zA-Z0-9_]+$/.test(t))
        return 'Username may only contain letters, digits, and underscores (_)';
    if (/_{2,}/.test(t))
        return 'Username cannot have consecutive underscores';
    if (/_$/.test(t))
        return 'Username cannot end with an underscore';
    return null;
};

/** Password: min 8 chars, at least one letter and one digit, no leading/trailing spaces. */
export const validatePassword = (v) => {
    if (!v) return 'Password is required';
    if (v !== v.trim()) return 'Password cannot start or end with spaces';
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-zA-Z]/.test(v)) return 'Password must contain at least one letter';
    if (!/\d/.test(v)) return 'Password must contain at least one digit';
    return null;
};

/** URL: must begin with http:// or https://, no spaces, parseable by the URL constructor. */
export const validateUrl = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'URL is required';
    if (/\s/.test(t)) return 'URL cannot contain spaces';
    if (!/^https?:\/\/.+\..+/.test(t))
        return 'Enter a valid URL starting with http:// or https://';
    try { new URL(t); } catch { return 'Enter a valid URL (e.g. https://example.com/file)'; }
    return null;
};

/** Optional URL: same as validateUrl but returns null when the field is empty. */
export const validateOptionalUrl = (v) => {
    if (!String(v ?? '').trim()) return null;
    return validateUrl(v);
};

/** Term: YYYY-Season — year 2000–2039, season one of Spring/Summer/Fall/Winter (case-sensitive). */
export const validateTerm = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Term is required';
    if (!/^20[0-3]\d-(Spring|Summer|Fall|Winter)$/.test(t))
        return 'Use format YYYY-Season — e.g. 2026-Spring (seasons: Spring, Summer, Fall, Winter)';
    return null;
};

/** Course code: 2–6 uppercase letters followed by 2–6 digits (normalised to uppercase). */
export const validateCourseCode = (v) => {
    const t = String(v ?? '').trim().toUpperCase();
    if (!t) return 'Course code is required';
    if (t.length < 4) return 'Course code must be at least 4 characters';
    if (!/^[A-Z]{2,6}\d{2,6}$/.test(t))
        return 'Course code must be 2–6 letters followed by 2–6 digits (e.g. CS101, MATH202)';
    return null;
};

/** JSON: valid parseable object or array when non-empty; returns null when empty (optional field). */
export const validateJson = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return null;
    try {
        const parsed = JSON.parse(t);
        if (typeof parsed !== 'object' || parsed === null)
            return 'Must be a JSON object { } or array [ ], not a plain value';
        return null;
    } catch {
        return 'Invalid JSON — check for missing quotes, braces, or commas';
    }
};

/** Positive ID: pure digits (no dots, dashes, symbols), integer ≥ 1. Required. */
export const validatePositiveId = (v) => {
    const s = String(v ?? '').trim();
    if (!s) return 'ID is required';
    if (!/^\d+$/.test(s))
        return 'ID must be a positive whole number — no dots, dashes, or symbols';
    if (parseInt(s, 10) < 1) return 'ID must be at least 1';
    return null;
};

/** Optional positive ID: same as validatePositiveId but returns null when empty. */
export const validateOptionalPositiveId = (v) => {
    if (!String(v ?? '').trim()) return null;
    return validatePositiveId(v);
};

/**
 * Positive integer within a range (no decimals, no symbols).
 * @param {string|number} v
 * @param {number} min
 * @param {number} max
 * @param {string} label  field display name used in the error message
 */
export const validatePositiveInteger = (v, min = 1, max = Infinity, label = 'Value') => {
    const s = String(v ?? '').trim();
    if (!s) return `${label} is required`;
    if (!/^\d+$/.test(s)) return `${label} must be a whole number — no decimals or symbols`;
    const n = parseInt(s, 10);
    if (n < min) return `${label} must be at least ${min}`;
    if (isFinite(max) && n > max) return `${label} cannot exceed ${max}`;
    return null;
};

/**
 * Monetary / decimal amount.
 * @param {string|number} v
 * @param {number} min  default 0.01
 * @param {number} max  default 9 999 999
 */
export const validateAmount = (v, min = 0.01, max = 9_999_999) => {
    const s = String(v ?? '').trim();
    if (!s) return 'Amount is required';
    const n = Number(s);
    if (isNaN(n)) return 'Enter a valid number';
    if (n < min) return `Amount must be at least ${min}`;
    if (n > max) return `Amount cannot exceed ${max.toLocaleString()}`;
    return null;
};

/**
 * Score: must be a number ≥ 0 and ≤ maxScore.
 * @param {string|number} v
 * @param {number} [maxScore]
 */
export const validateScore = (v, maxScore) => {
    const s = String(v ?? '').trim();
    if (s === '') return 'Score is required';
    const n = Number(s);
    if (isNaN(n)) return 'Score must be a number';
    if (n < 0) return 'Score cannot be negative';
    if (maxScore !== undefined && maxScore !== null && n > maxScore)
        return `Score cannot exceed the maximum of ${maxScore}`;
    return null;
};

/**
 * Full name: 2–200 chars, Unicode letters + spaces + hyphens + apostrophes + dots.
 * Rejects purely numeric values and symbols.
 * @param {string} v
 * @param {string} label  field display name
 */
export const validateName = (v, label = 'Name') => {
    const t = String(v ?? '').trim();
    if (!t) return `${label} is required`;
    if (t.length < 2) return `${label} must be at least 2 characters`;
    if (t.length > 200) return `${label} cannot exceed 200 characters`;
    if (/^\d+$/.test(t)) return `${label} cannot be purely numeric`;
    if (!/^[\p{L}\s'\-.]+$/u.test(t))
        return `${label} can only contain letters, spaces, hyphens, apostrophes, and dots`;
    return null;
};

/**
 * Minimum trimmed length (field is required).
 * @param {string} v
 * @param {number} n  minimum character count after trimming
 * @param {string} label
 */
export const validateMinLength = (v, n, label = 'Field') => {
    const t = String(v ?? '').trim();
    if (!t) return `${label} is required`;
    if (t.length < n) return `${label} must be at least ${n} characters`;
    return null;
};

/** Not-whitespace: trimmed value must be non-empty — fixes a space bypassing HTML required. */
export const validateNotWhitespace = (v, label = 'Field') => {
    if (!String(v ?? '').trim()) return `${label} cannot be blank`;
    return null;
};

/**
 * Date range: end must be strictly after start.
 * Returns null when either date is missing (validation is skipped).
 * @param {string} from  ISO date / datetime string
 * @param {string} to    ISO date / datetime string
 */
export const validateDateRange = (from, to) => {
    if (!from || !to) return null;
    if (new Date(to) <= new Date(from)) return 'End date must be after start date';
    return null;
};

/** Future date: given datetime must not be in the past. */
export const validateFutureDate = (v) => {
    if (!v) return 'Date is required';
    if (new Date(v) < new Date()) return 'Date must be in the future';
    return null;
};

/** Semantic version: v?major.minor(.patch)? — e.g. 1.0, v2.1, v2.1.3 */
export const validateVersion = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Version is required';
    if (!/^v?\d+\.\d+(\.\d+)?$/.test(t))
        return 'Use format like 1.0, v2.1, or v2.1.3';
    return null;
};

/** Address: trimmed 5–500 chars, not whitespace-only. */
export const validateAddress = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Address is required';
    if (t.length < 5) return 'Address must be at least 5 characters';
    if (t.length > 500) return 'Address cannot exceed 500 characters';
    return null;
};

/** National ID: 4–50 alphanumeric chars + hyphens; no spaces or other symbols. */
export const validateNationalId = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'National ID is required';
    if (t.length < 4) return 'National ID must be at least 4 characters';
    if (t.length > 50) return 'National ID cannot exceed 50 characters';
    if (!/^[a-zA-Z0-9-]+$/.test(t))
        return 'National ID can only contain letters, digits, and hyphens';
    return null;
};

/** Award type: 3–100 chars, letters / digits / spaces / hyphens. */
export const validateAwardType = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Award type is required';
    if (t.length < 3) return 'Award type must be at least 3 characters';
    if (t.length > 100) return 'Award type cannot exceed 100 characters';
    if (!/^[a-zA-Z0-9\s-]+$/.test(t))
        return 'Award type can only contain letters, digits, spaces, and hyphens';
    return null;
};

/** Title: course/assessment/content/discussion titles, fee items, ticket subjects.
 *  Letters, digits, spaces, and basic punctuation (- : ( ) & , . ' " /). Blocks @#$%^*+={}[]|<>~ */
export const validateTitle = (v, label = 'Title') => {
    const t = String(v ?? '').trim();
    if (!t) return `${label} is required`;
    if (t.length < 2) return `${label} must be at least 2 characters`;
    if (t.length > 200) return `${label} cannot exceed 200 characters`;
    if (/^\d+$/.test(t)) return `${label} cannot be purely numeric`;
    if (!/^[\w\s\-:()&,.'"\/]+$/u.test(t))
        return `${label} can only contain letters, digits, spaces, and basic punctuation (- : ( ) & , . ' ")`;
    return null;
};

/** Program name: letters, digits, spaces, hyphens, parentheses, dots, ampersand, commas. */
export const validateProgramName = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Program name is required';
    if (t.length < 2) return 'Program name must be at least 2 characters';
    if (t.length > 200) return 'Program name cannot exceed 200 characters';
    if (/^\d+$/.test(t)) return 'Program name cannot be purely numeric';
    if (!/^[\p{L}\d\s\-().&,]+$/u.test(t))
        return 'Program name can only contain letters, digits, spaces, hyphens, parentheses, dots, ampersand, and commas';
    return null;
};

/** Building name: letters, digits, spaces, hyphens, dots. */
export const validateBuildingName = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Building name is required';
    if (t.length < 2) return 'Building name must be at least 2 characters';
    if (t.length > 100) return 'Building name cannot exceed 100 characters';
    if (!/^[\p{L}\d\s\-.]+$/u.test(t))
        return 'Building name can only contain letters, digits, spaces, hyphens, and dots';
    return null;
};

/** Room number: alphanumeric + hyphens (e.g. A-101, B2-305, 401). */
export const validateRoomNumber = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Room number is required';
    if (t.length > 20) return 'Room number cannot exceed 20 characters';
    if (!/^[a-zA-Z0-9-]+$/.test(t))
        return 'Room number can only contain letters, digits, and hyphens';
    return null;
};

/** Course level: optional, alphanumeric + spaces + hyphens (e.g. UG, Graduate, 100-level). */
export const validateLevel = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return null; // optional
    if (t.length > 20) return 'Level cannot exceed 20 characters';
    if (!/^[a-zA-Z0-9\s-]+$/.test(t))
        return 'Level can only contain letters, digits, spaces, and hyphens';
    return null;
};

/** Payment / transaction reference: optional, alphanumeric + hyphens + slashes. */
export const validateReference = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return null; // optional
    if (t.length > 100) return 'Reference cannot exceed 100 characters';
    if (!/^[a-zA-Z0-9\-/]+$/.test(t))
        return 'Reference can only contain letters, digits, hyphens, and slashes';
    return null;
};

/** TOTP code: exactly 6 digits. */
export const validateTotpCode = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Verification code is required';
    if (!/^\d{6}$/.test(t))
        return 'Enter the 6-digit code shown in your authenticator app';
    return null;
};

/**
 * Utility: true when any value in an errors object is truthy.
 * Use as a submit guard: if (hasErrors(errors)) { setErrors(next); return; }
 * @param {Object} errorsObj
 * @returns {boolean}
 */
export const hasErrors = (errorsObj) =>
    Object.values(errorsObj).some((v) => v !== null && v !== undefined && v !== '');
