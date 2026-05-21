import ModalPortal from './ModalPortal';

export default function ConfirmDialog({ show, title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmVariant = 'primary' }) {
    if (!show) return null;
    return (
        <ModalPortal>
            <div className="modal-backdrop fade show"></div>
            <div className="modal fade show d-block" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button type="button" className="btn-close" onClick={onCancel} />
                        </div>
                        <div className="modal-body">
                            <p className="mb-0">{message}</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onCancel}>
                                Cancel
                            </button>
                            <button type="button" className={`btn btn-${confirmVariant}`} onClick={onConfirm}>
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}