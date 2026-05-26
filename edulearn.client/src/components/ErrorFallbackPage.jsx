export default function ErrorFallbackPage({ error, onReload, onReset }) {
  return (
    <div className="container py-5">
      <h1 className="h3">Something went wrong.</h1>
      <p className="text-muted">The team has been notified. Your in-progress work has been saved locally where possible.</p>
      <details className="mt-3"><summary>Technical details</summary>
        <pre className="bg-light p-2 small">{error?.message || 'Unknown error'}</pre>
      </details>
      <div className="mt-4">
        <button className="btn btn-primary me-2" onClick={onReload}>Reload page</button>
        <button className="btn btn-outline-secondary" onClick={onReset}>Try again</button>
      </div>
    </div>
  );
}
