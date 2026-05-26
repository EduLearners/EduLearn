import axiosClient from '../api/axiosClient';

const BUFFER_KEY = 'errorReporter.buffer.v1';
const BATCH_MAX = 10;
const FLUSH_DEBOUNCE_MS = 1500;
const PER_MINUTE = 30;

function nowMs() { return Date.now(); }

class ErrorReporter {
  constructor() {
    this.buffer = JSON.parse(sessionStorage.getItem(BUFFER_KEY) || '[]');
    this.lastFlushAt = 0;
    this.flushTimer = null;
    this.sentTimestamps = [];
    window.addEventListener('online', () => this.flush());
  }
  enqueue(payload) {
    this.buffer.push({ ...payload, ts: nowMs() });
    sessionStorage.setItem(BUFFER_KEY, JSON.stringify(this.buffer));
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), FLUSH_DEBOUNCE_MS);
  }
  reportRender(err, componentStack, url) {
    this.enqueue({ severity: 'Error', kind: 'render', message: err?.message ?? 'render error', stackTrace: err?.stack, componentStack, clientUrl: url, userAgent: navigator.userAgent });
  }
  reportNetwork(err, cfg) {
    this.enqueue({ severity: 'Warning', kind: 'network', message: err?.message ?? 'network', clientUrl: cfg?.url, userAgent: navigator.userAgent });
  }
  reportApi(err) {
    this.enqueue({ severity: 'Error', kind: 'api-5xx', message: `HTTP ${err?.response?.status} ${err?.config?.url}`, stackTrace: JSON.stringify(err?.response?.data ?? null)?.slice(0, 1000), clientUrl: window.location.href, userAgent: navigator.userAgent });
  }
  reportClient(severity, msg, ctx) {
    this.enqueue({ severity, kind: 'client', message: msg, stackTrace: ctx?.stack, clientUrl: window.location.href, userAgent: navigator.userAgent });
  }
  _withinRate() {
    const oneMinuteAgo = nowMs() - 60_000;
    this.sentTimestamps = this.sentTimestamps.filter(t => t > oneMinuteAgo);
    return this.sentTimestamps.length < PER_MINUTE;
  }
  async flush() {
    if (!navigator.onLine || this.buffer.length === 0) return;
    if (!this._withinRate()) return;
    const batch = this.buffer.slice(0, BATCH_MAX);
    try {
      await Promise.all(batch.map(p => axiosClient.post('/clientlogs', p)));
      this.sentTimestamps.push(...batch.map(() => nowMs()));
      this.buffer = this.buffer.slice(batch.length);
      sessionStorage.setItem(BUFFER_KEY, JSON.stringify(this.buffer));
      if (this.buffer.length) setTimeout(() => this.flush(), 500);
    } catch { /* keep buffer; retry on next enqueue */ }
  }
}

export const errorReporter = new ErrorReporter();
