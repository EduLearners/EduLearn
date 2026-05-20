// EmptyState.jsx
// Shared empty-state component. Used when a list/table has no data.
// Props:
//   icon        — Bootstrap icon class name (e.g. "bi-inbox")
//   title       — primary message (required)
//   description — secondary message (optional)
//   action      — { label, onClick } renders a CTA button (optional)

export default function EmptyState({ icon = 'bi-inbox', title, description, action }) {
  return (
    <div className="text-center py-5 text-muted">
      <i
        className={`bi ${icon}`}
        style={{ fontSize: '3rem', opacity: 0.45, display: 'block', marginBottom: '1rem' }}
      ></i>
      <p className="mb-1 fw-medium" style={{ color: 'var(--text)', fontSize: '1rem' }}>
        {title}
      </p>
      {description && (
        <p className="mb-3 small" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          className="btn btn-primary-edulearn btn-sm"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
