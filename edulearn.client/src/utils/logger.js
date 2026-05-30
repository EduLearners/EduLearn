// Minimal single-choke-point logger. Keeps a consistent prefix and lets us
// quiet info logs in production without touching call sites.
const isDev = import.meta.env.DEV;

export const logger = {
    error: (...args) => console.error('[EduLearn]', ...args),
    warn: (...args) => console.warn('[EduLearn]', ...args),
    info: (...args) => { if (isDev) console.info('[EduLearn]', ...args); },
};
