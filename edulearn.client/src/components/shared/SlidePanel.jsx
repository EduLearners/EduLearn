// SlidePanel.jsx
// Shared Bootstrap offcanvas wrapper.
// Props:
//   show     — boolean
//   onHide   — () => void
//   title    — string
//   width    — CSS width (default '480px')
//   children — panel body content

export default function SlidePanel({ show, onHide, title, width = '480px', children }) {
  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="offcanvas-backdrop fade show"
        onClick={onHide}
        style={{ zIndex: 1040 }}
      ></div>

      {/* Panel */}
      <div
        className="offcanvas offcanvas-end show"
        tabIndex="-1"
        style={{ width, zIndex: 1045, visibility: 'visible' }}
        aria-modal="true"
        role="dialog"
        aria-label={title}
      >
        <div className="offcanvas-header bg-primary-edulearn text-white">
          <h5 className="offcanvas-title">{title}</h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            aria-label="Close"
            onClick={onHide}
          ></button>
        </div>
        <div className="offcanvas-body">
          {children}
        </div>
      </div>
    </>
  );
}
