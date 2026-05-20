import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomService } from '../../services/roomService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

const RES_CONFIG = [
    { key: 'projector',   label: 'Projector',    icon: 'bi-projector',   color: '#185FA5', bg: 'linear-gradient(135deg, #d4e8f8 0%, #E6F1FB 100%)', iconBg: '#185FA520', check: v => !!v, detail: v => v ? 'Available' : 'Not Available' },
    { key: 'whiteboard',  label: 'Whiteboard',   icon: 'bi-easel',       color: '#27500A', bg: 'linear-gradient(135deg, #d8ebc5 0%, #EAF3DE 100%)', iconBg: '#27500A20', check: v => !!v, detail: v => v ? 'Available' : 'Not Available' },
    { key: 'smartBoard',  label: 'Smart Board',  icon: 'bi-display',     color: '#3C3489', bg: 'linear-gradient(135deg, #dddaf8 0%, #EEEDFE 100%)', iconBg: '#3C348920', check: v => !!v, detail: v => v ? 'Available' : 'Not Available' },
    { key: 'computers',   label: 'Computers',    icon: 'bi-pc-display',  color: '#854F0B', bg: 'linear-gradient(135deg, #f5e0c0 0%, #FAEEDA 100%)', iconBg: '#854F0B20', check: v => v > 0, detail: v => v > 0 ? `${v} PCs` : 'None' },
];

function ResourceCard({ config, value, index }) {
    const [hovered, setHovered] = useState(false);
    const [typed, setTyped] = useState('');
    const [cursorVisible, setCursorVisible] = useState(true);
    const available = config.check(value);

    useEffect(() => {
        if (!hovered) { setTyped(''); return; }
        const text = config.label;
        let i = 0;
        setTyped('');
        const startTime = performance.now();
        const charDuration = 45;
        const animate = (now) => {
            const elapsed = now - startTime;
            const charsToShow = Math.min(Math.floor(elapsed / charDuration) + 1, text.length);
            if (charsToShow !== i) {
                i = charsToShow;
                setTyped(text.slice(0, i));
            }
            if (i < text.length) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [hovered, config.label]);

    useEffect(() => {
        if (!hovered) return;
        const blink = setInterval(() => setCursorVisible(v => !v), 400);
        return () => { clearInterval(blink); setCursorVisible(true); };
    }, [hovered]);

    return (
        <div className="col-md-3 col-sm-6" style={{ animation: `cardEntrance 0.4s ease ${0.1 + index * 0.08}s both` }}>
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    background: config.bg,
                    borderRadius: 14,
                    padding: '28px 16px',
                    textAlign: 'center',
                    cursor: 'default',
                    border: `1px solid ${config.color}22`,
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
                    transform: hovered ? 'translateY(-6px) scale(1.02)' : 'none',
                    boxShadow: hovered ? `0 12px 28px ${config.color}18` : '0 2px 8px rgba(0,0,0,0.03)',
                    minHeight: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: available ? 1 : 0.7,
                }}
            >
                {/* Normal state */}
                <div style={{
                    opacity: hovered ? 0 : 1,
                    transform: hovered ? 'scale(0.7) translateY(-10px)' : 'scale(1) translateY(0)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: hovered ? 'absolute' : 'relative',
                }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: config.iconBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px',
                        transition: 'transform 0.3s ease',
                    }}>
                        <i className={`bi ${config.icon}`} style={{ fontSize: 24, color: config.color }} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: config.color }}>{config.label}</div>
                    <div style={{ fontSize: 11, color: config.color + 'aa', marginTop: 4 }}>{config.detail(value)}</div>
                </div>

                {/* Hover state */}
                <div style={{
                    opacity: hovered ? 1 : 0,
                    transform: hovered ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.9)',
                    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s',
                    position: hovered ? 'relative' : 'absolute',
                }}>
                    <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: available ? config.color : '#888',
                        fontFamily: '"IBM Plex Mono", monospace',
                        letterSpacing: 1.5,
                        minHeight: 30,
                        lineHeight: 1.3,
                    }}>
                        {typed}<span style={{ opacity: typed.length < config.label.length && cursorVisible ? 1 : 0, transition: 'opacity 0.1s ease', color: config.color }}> |</span>
                    </div>
                    <div style={{
                        fontSize: 12,
                        color: available ? config.color : '#999',
                        marginTop: 8,
                        fontWeight: 500,
                        opacity: typed.length === config.label.length ? 1 : 0,
                        transform: typed.length === config.label.length ? 'translateY(0)' : 'translateY(5px)',
                        transition: 'all 0.3s ease 0.1s',
                    }}>
                        {available ? '\u2713 Ready' : '\u2717 Unavailable'}
                    </div>
                </div>
            </div>
        </div>
    );
}

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
                                <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
                                {!resources ? (
                                    <p className="text-muted mb-0">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No resources listed for this room.
                                    </p>
                                ) : (
                                    <div className="row g-3">
                                        {RES_CONFIG.map((cfg, i) => (
                                            <ResourceCard key={cfg.key} config={cfg} value={resources[cfg.key]} index={i} />
                                        ))}
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