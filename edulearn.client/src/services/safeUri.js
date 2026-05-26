const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

export function safeUri(input) {
  if (!input || typeof input !== 'string') return null;
  try {
    const u = new URL(input);
    return SAFE_SCHEMES.has(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
