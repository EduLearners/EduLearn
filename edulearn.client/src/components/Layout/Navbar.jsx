import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

export default function Navbar() {
    const navigate = useNavigate();
    const { username, role } = authService.getCurrentUser();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close the dropdown when clicking outside of it
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
        navigate('/login');
    };

    // Initials shown inside the avatar circle (e.g. "VikashV" → "V", "John Doe" → "JD")
    const initials = (username || '?')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase())
        .join('');

    return (
        <nav className="navbar navbar-expand-lg bg-primary-edulearn px-4 shadow-sm">
            <span
                className="navbar-brand text-white fw-bold"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/dashboard')}
            >
                <i className="bi bi-mortarboard-fill me-2"></i>EduLearn
            </span>

            <div className="ms-auto position-relative" ref={dropdownRef}>
                {/* The clickable avatar pill */}
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
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: '#e2a94b',
                            color: '#1a3c6e',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                        }}
                    >
                        {initials}
                    </span>
                    <span className="text-start">
                        <div style={{ lineHeight: 1, fontSize: 13, fontWeight: 600 }}>{username}</div>
                        <small style={{ fontSize: 10, opacity: 0.8 }}>{role}</small>
                    </span>
                    <i className={`bi bi-chevron-${open ? 'up' : 'down'} ms-1 small`}></i>
                </button>

                {/* The dropdown panel */}
                {open && (
                    <div
                        className="position-absolute end-0 mt-2 bg-white rounded shadow-lg"
                        style={{ minWidth: 260, zIndex: 1050 }}
                    >
                        {/* Header */}
                        <div className="p-3 border-bottom bg-light rounded-top">
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        backgroundColor: '#1a3c6e',
                                        color: 'white',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 18,
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

                        {/* Actions */}
                        <div>
                            <button
                                className="btn btn-link w-100 text-start text-decoration-none text-dark px-3 py-2"
                                onClick={() => {
                                    setOpen(false);
                                    navigate('/profile');
                                }}
                            >
                                <i className="bi bi-person-circle me-2 text-primary-edulearn"></i>
                                Profile
                            </button>

                            <button
                                className="btn btn-link w-100 text-start text-decoration-none text-dark px-3 py-2 border-top"
                                onClick={() => {
                                    setOpen(false);
                                    navigate('/dashboard');
                                }}
                            >
                                <i className="bi bi-speedometer2 me-2 text-muted"></i>
                                Dashboard
                            </button>

                            <button
                                className="btn btn-link w-100 text-start text-decoration-none text-danger px-3 py-2 border-top"
                                onClick={handleLogout}
                            >
                                <i className="bi bi-box-arrow-right me-2"></i>
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
