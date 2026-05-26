import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { contentService } from '../../services/contentService';
import { authService } from '../../services/authService';
import { ContentType } from '../../models/Content';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import { safeUri } from '../../services/safeUri';

export default function ContentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const canManage = ['Instructor', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadContent();
    }, [id]);

    const loadContent = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await contentService.getById(id);
            setContent(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Icon per content type — matches corrected ContentType enum
    const typeIcon = {
        [ContentType.DOCUMENT]: 'file-earmark-text',
        [ContentType.VIDEO]: 'play-circle',
        [ContentType.QUIZ]: 'question-circle',
        [ContentType.LINK]: 'link-45deg',
    };

    // Whether this content type has an openable URI
    const isLinkable = content &&
        [ContentType.VIDEO, ContentType.LINK].includes(content.type);

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-collection-play me-2"></i>
                    Content Detail
                </h2>
                <div className="d-flex gap-2">
                    {canManage && content && (
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => navigate(`/contents/${id}/edit`)}
                        >
                            <i className="bi bi-pencil me-2"></i>Edit
                        </button>
                    )}
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/contents')}
                    >
                        <i className="bi bi-arrow-left me-1"></i>Back
                    </button>
                </div>
            </div>

            {/* Error */}
            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Loading */}
            {loading && <Loading message="Loading content..." />}

            {/* Content */}
            {!loading && content && (
                <>
                    {/* Content Info Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary-edulearn text-white">
                            <div className="d-flex align-items-center gap-2">
                                <i className={`bi bi-${typeIcon[content.type] || 'file'}`}></i>
                                <strong>{content.title}</strong>
                                <span className="badge bg-light text-dark ms-auto">
                                    {content.type}
                                </span>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Title</dt>
                                        <dd className="col-sm-7 fw-bold">
                                            {content.title}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Type</dt>
                                        <dd className="col-sm-7">
                                            <span className="badge bg-secondary">
                                                {content.type}
                                            </span>
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Course</dt>
                                        <dd className="col-sm-7">
                                            {content.courseName || content.courseID || '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Status</dt>
                                        <dd className="col-sm-7">
                                            <StatusBadge status={content.status} />
                                        </dd>
                                    </dl>
                                </div>

                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Uploaded By</dt>
                                        <dd className="col-sm-7">
                                            {content.uploadedByName || '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Uploaded At</dt>
                                        <dd className="col-sm-7">
                                            {content.uploadedAt
                                                ? new Date(content.uploadedAt).toLocaleDateString()
                                                : '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Version</dt>
                                        <dd className="col-sm-7">
                                            v{content.version}
                                        </dd>
                                    </dl>
                                </div>

                                {content.metadataJSON && (
                                    <div className="col-12">
                                        <dt className="text-muted small text-uppercase mb-1">
                                            Metadata
                                        </dt>
                                        <div className="p-3 bg-light rounded">
                                            <pre
                                                className="mb-0"
                                                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                            >
                                                {content.metadataJSON}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content URI Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <strong>
                                <i className="bi bi-link-45deg me-2"></i>
                                Content Resource
                            </strong>
                        </div>
                        <div className="card-body">
                            {content.uri ? (
                                <div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small text-uppercase">
                                            Resource URI
                                        </label>
                                        <div className="input-group">
                                            <div className="form-control font-monospace d-flex align-items-center">
                                                {(() => {
                                                    const href = safeUri(content?.uri);
                                                    return href
                                                        ? (
                                                            <a
                                                                href={href}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                data-testid="content-uri"
                                                                className="text-decoration-none"
                                                            >
                                                                {content.uri} <i className="bi bi-box-arrow-up-right ms-1" />
                                                            </a>
                                                        )
                                                        : (
                                                            <span className="text-muted" data-testid="content-uri-invalid">
                                                                {content?.uri || '—'} (invalid URL)
                                                            </span>
                                                        );
                                                })()}
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() =>
                                                    navigator.clipboard.writeText(content.uri)
                                                }
                                                title="Copy URI"
                                            >
                                                <i className="bi bi-clipboard"></i>
                                            </button>
                                        </div>
                                    </div>
                                    {isLinkable && (
                                        <a href={content.uri} target="_blank" rel="noreferrer" className="btn btn-primary-edulearn btn-sm">
                                            <i className="bi bi-box-arrow-up-right me-2"></i>
                                            Open Resource
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted mb-0">
                                    <i className="bi bi-info-circle me-2"></i>
                                    No resource URI provided for this content.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-light">
                            <strong>
                                <i className="bi bi-lightning me-2"></i>
                                Quick Actions
                            </strong>
                        </div>
                        <div className="card-body">
                            <div className="d-flex gap-2 flex-wrap">
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate('/contents')}
                                >
                                    <i className="bi bi-collection-play me-2"></i>
                                    All Contents
                                </button>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate('/assessments')}
                                >
                                    <i className="bi bi-file-earmark-text me-2"></i>
                                    View Assessments
                                </button>
                                {canManage && (
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => navigate(`/contents/${id}/edit`)}
                                    >
                                        <i className="bi bi-pencil me-2"></i>
                                        Edit Content
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}