import { useState, useEffect, useRef } from 'react';
import { useNavigate }   from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearSession, selectUsername, selectRole } from '../../store/authSlice';
import { clearPersona }  from '../../store/personaSlice';
import { authService }   from '../../services/authService';

<<<<<<< HEAD
export default function Navbar() {
    const navigate  = useNavigate();
    const dispatch  = useDispatch();

    // Read from Redux store — reactive to login/logout
    const username = useSelector(selectUsername);
    const role     = useSelector(selectRole);

=======
export default function Navbar({ sidebarOpen, onToggleSidebar }) {
    const navigate = useNavigate();
    const { username, role } = authService.getCurrentUser();
>>>>>>> UI/ashish
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        authService.logout();
        dispatch(clearSession());
        dispatch(clearPersona());
        navigate('/login');
    };

    const initials = (username || '?')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase())
        .join('');

    return (
        <nav className="navbar navbar-expand-lg bg-primary-edulearn shadow-sm" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1030, padding: 0, height: 56 }}>
            {/* Hamburger - fixed position */}
            <div style={{
                width: 56,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 56,
            }}>
                <button
                    className="btn btn-sm text-white d-flex align-items-center justify-content-center"
                    onClick={onToggleSidebar}
                    title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 38, height: 38, padding: 0 }}
                >
                    <i className={`bi ${sidebarOpen ? 'bi-layout-sidebar-inset' : 'bi-list'}`} style={{ fontSize: 18 }}></i>
                </button>
            </div>

            {/* Rest of navbar */}
            <div className="d-flex align-items-center flex-grow-1 px-3" style={{ height: 56 }}>
                <span
                    className="navbar-brand text-white fw-bold mb-0"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/')}
                >
                    <i className="bi bi-mortarboard-fill me-2"></i>EduLearn
                </span>

            <div className="ms-auto position-relative" ref={dropdownRef}>
                <button
                    onClick={() => setOpen(!open)}
                    className="btn d-flex align-items-center gap-2 text-white"
                    style={{
                        backgroundColor: open ? 'rgba(255,255,255,0.15)' : 'transparent',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: 999,
                        padding: '4px 12px 4px 4px',
                    }}
                >
                    <span
                        style={{
                            width: 32, height: 32, borderRadius: '50%',
                            backgroundColor: 'var(--accent)',
                            color: 'var(--primary)',
                            display: 'inline-flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 700, fontSize: 13,
                        }}
                    >
                        {initials}
                    </span>
                    <span className="text-start">
                        <div style={{ lineHeight: 1, fontSize: 13, fontWeight: 600 }}>{username}</div>
                        <small style={{ fontSize: 10, opacity: 0.8 }}>{role}</small>
                    </span>
                    <i
                        className="bi bi-chevron-down ms-1 small"
                        style={{
                            transition: 'transform 0.3s ease',
                            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                            display: 'inline-block',
                        }}
                    ></i>
                </button>

<<<<<<< HEAD
                {open && (
                    <div
                        className="position-absolute end-0 mt-2 bg-white rounded shadow-lg"
                        style={{ minWidth: 260, zIndex: 1050 }}
                    >
=======
                {/* The dropdown panel */}
                <div
                    className="position-absolute end-0 mt-2 bg-white rounded shadow-lg"
                    style={{
                        minWidth: 260,
                        zIndex: 1050,
                        opacity: open ? 1 : 0,
                        transform: open ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
                        pointerEvents: open ? 'auto' : 'none',
                        visibility: open ? 'visible' : 'hidden',
                        transition: 'opacity 0.25s ease, transform 0.25s ease, visibility 0.25s',
                        transformOrigin: 'top right',
                    }}
                >
                        {/* Header */}
>>>>>>> UI/ashish
                        <div className="p-3 border-bottom bg-light rounded-top">
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    style={{
                                        width: 48, height: 48, borderRadius: '50%',
                                        backgroundColor: 'var(--primary)',
                                        color: '#ffffff',
                                        display: 'inline-flex', alignItems: 'center',
                                        justifyContent: 'center', fontWeight: 700, fontSize: 18,
                                    }}
                                >
                                    {initials}
                                </div>
                                <div>
                                    <div className="fw-bold">{username}</div>
                                    <small className="text-muted">
                                        <i className="bi bi-shield-check me-1"></i>{role}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div>
                            <button
                                className="btn btn-link w-100 text-start text-decoration-none text-dark px-3 py-2"
                                onClick={() => { setOpen(false); navigate('/profile'); }}
                            >
                                <i className="bi bi-person-circle me-2 text-primary-edulearn"></i>Profile
                            </button>
                            <button
                                className="btn btn-link w-100 text-start text-decoration-none text-dark px-3 py-2 border-top"
                                onClick={() => { setOpen(false); navigate('/dashboard'); }}
                            >
                                <i className="bi bi-speedometer2 me-2 text-muted"></i>Dashboard
                            </button>
                            <button
                                className="btn btn-link w-100 text-start text-decoration-none text-danger px-3 py-2 border-top"
                                onClick={handleLogout}
                            >
                                <i className="bi bi-box-arrow-right me-2"></i>Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
