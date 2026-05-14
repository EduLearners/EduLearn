import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomService } from '../../services/roomService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function RoomDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadRoom();
    }, [id]);

    const loadRoom = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await roomService.getById(id);
            setRoom(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const parseResources = (json) => {
        if (!json) return null;
        try { return JSON.parse(json); } catch { return null; }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-door-closed me-2"></i>Room Detail
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/rooms')}
                >
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading room..." />}

            {!loading && room && (() => {
                const resources = parseResources(room.resourcesJSON);
                return (
                    <>
                        {/* Room Info Card */}
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-primary-edulearn text-white">
                                <div className="d-flex align-items-center justify-content-between">
                                    <strong>
                                        <i className="bi bi-info-circle me-2"></i>
                                        Room Information
                                    </strong>
                                    <StatusBadge status={room.status} />
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <dl className="row mb-0">
                                            <dt className="col-sm-5 text-muted">Room ID</dt>
                                            <dd className="col-sm-7">
                                                <code>#{room.roomID}</code>
                                            </dd>

                                            <dt className="col-sm-5 text-muted">Building</dt>
                                            <dd className="col-sm-7 fw-bold">{room.building}</dd>

                                            <dt className="col-sm-5 text-muted">Room Number</dt>
                                            <dd className="col-sm-7">
                                                <code>{room.roomNumber}</code>
                                            </dd>
                                        </dl>
                                    </div>

                                    <div className="col-md-6">
                                        <dl className="row mb-0">
                                            <dt className="col-sm-5 text-muted">Capacity</dt>
                                            <dd className="col-sm-7 fw-bold">
                                                {room.capacity} seats
                                            </dd>

                                            <dt className="col-sm-5 text-muted">Status</dt>
                                            <dd className="col-sm-7">
                                                <StatusBadge status={room.status} />
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Resources Card */}
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-light">
                                <strong>
                                    <i className="bi bi-tools me-2"></i>
                                    Resources
                                </strong>
                            </div>
                            <div className="card-body">
                                {!resources ? (
                                    <p className="text-muted mb-0">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No resources listed for this room.
                                    </p>
                                ) : (
                                    <div className="row g-3">
                                        <div className="col-md-3">
                                            <div className={`p-3 rounded text-center border ${resources.projector ? 'border-success bg-light' : 'border-secondary opacity-50'}`}>
                                                <i className={`bi bi-projector fs-3 ${resources.projector ? 'text-success' : 'text-muted'}`}></i>
                                                <div className="mt-2 small fw-bold">Projector</div>
                                                <div className="small text-muted">
                                                    {resources.projector ? 'Available' : 'Not Available'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className={`p-3 rounded text-center border ${resources.whiteboard ? 'border-success bg-light' : 'border-secondary opacity-50'}`}>
                                                <i className={`bi bi-easel fs-3 ${resources.whiteboard ? 'text-success' : 'text-muted'}`}></i>
                                                <div className="mt-2 small fw-bold">Whiteboard</div>
                                                <div className="small text-muted">
                                                    {resources.whiteboard ? 'Available' : 'Not Available'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className={`p-3 rounded text-center border ${resources.smartBoard ? 'border-success bg-light' : 'border-secondary opacity-50'}`}>
                                                <i className={`bi bi-display fs-3 ${resources.smartBoard ? 'text-success' : 'text-muted'}`}></i>
                                                <div className="mt-2 small fw-bold">Smart Board</div>
                                                <div className="small text-muted">
                                                    {resources.smartBoard ? 'Available' : 'Not Available'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className={`p-3 rounded text-center border ${resources.computers > 0 ? 'border-success bg-light' : 'border-secondary opacity-50'}`}>
                                                <i className={`bi bi-pc-display fs-3 ${resources.computers > 0 ? 'text-success' : 'text-muted'}`}></i>
                                                <div className="mt-2 small fw-bold">Computers</div>
                                                <div className="small text-muted">
                                                    {resources.computers > 0 ? `${resources.computers} PCs` : 'None'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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
                                        onClick={() => navigate('/sections')}
                                    >
                                        <i className="bi bi-collection me-2"></i>
                                        View Sections
                                    </button>
                                    <button
                                        className="btn btn-outline-primary"
                                        onClick={() => navigate('/timetable')}
                                    >
                                        <i className="bi bi-calendar3 me-2"></i>
                                        View Timetable
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => navigate('/rooms')}
                                    >
                                        <i className="bi bi-door-closed me-2"></i>
                                        All Rooms
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                );
            })()}
        </div>
    );
}