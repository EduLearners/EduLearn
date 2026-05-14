import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { programService } from '../../services/programService';
import { courseService } from '../../services/courseService';
import { roomService } from '../../services/roomService';
import { userService } from '../../services/userService';
import Loading from '../../components/Loading';

const TERM = '2026-Spring';

export default function DeptAdminDashboard() {
    const navigate = useNavigate();
    const { username } = authService.getCurrentUser();
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const today = new Date();

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setLoading(true);
        const s = {};
        try {
            const [programs, courses, rooms, instructors] = await Promise.allSettled([
                programService.getAll(),
                courseService.getAll(),
                roomService.getAll(),
                userService.getByRole('Instructor'),
            ]);
            // Note: no GET /api/sections list-all endpoint in backend
            if (programs.status === 'fulfilled') s.programs = (programs.value || []).filter(p => p.status === 'Active').length;
            if (courses.status === 'fulfilled') s.courses = (courses.value || []).length;
            if (rooms.status === 'fulfilled') {
                const d = rooms.value || [];
                s.rooms = d.length;
                s.availableRooms = d.filter(r => r.status === 'Available').length;
            }
            if (instructors.status === 'fulfilled') s.instructors = (instructors.value || []).length;
        } catch { }
        setStats(s);
        setLoading(false);
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <span className="badge" style={{ background: '#FAEEDA', color: '#633806', fontSize: 13 }}>DeptAdmin</span>
                    <h2 className="mb-0 text-primary-edulearn">Department Admin Dashboard</h2>
                </div>
                <small className="text-muted">{today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
            </div>

            <div className="card shadow-sm mb-4 border-0 bg-light">
                <div className="card-body d-flex align-items-center justify-content-between">
                    <div>
                        <h4 className="mb-1">Welcome back, {username}! 👋</h4>
                        <p className="mb-0 text-muted">Term: {TERM} &nbsp;·&nbsp; Role: DeptAdmin</p>
                    </div>
                    <i className="bi bi-building text-muted" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/programs')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Programs</div>
                            <div className="display-5 fw-bold" style={{ color: '#854F0B' }}>{stats.programs ?? '—'}</div>
                            <small className="text-muted">active</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/courses')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Courses</div>
                            <div className="display-5 fw-bold" style={{ color: '#185FA5' }}>{stats.courses ?? '—'}</div>
                            <small className="text-muted">this dept</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/sections')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Sections</div>
                            <div className="display-5 fw-bold" style={{ color: '#3B6D11' }}>—</div>
                            <small className="text-muted">view sections</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/rooms')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Rooms</div>
                            <div className="display-5 fw-bold" style={{ color: '#534AB7' }}>{stats.rooms ?? '—'}</div>
                            <small className="text-muted">{stats.availableRooms ?? 0} available</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light">
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Instructors</div>
                            <div className="display-5 fw-bold" style={{ color: '#0F6E56' }}>{stats.instructors ?? '—'}</div>
                            <small className="text-muted">active</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header bg-light"><strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong></div>
                <div className="card-body">
                    <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/programs/new')}><i className="bi bi-plus me-2"></i>New Program</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/courses')}><i className="bi bi-book me-2"></i>Courses</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/sections')}><i className="bi bi-collection me-2"></i>Sections</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/rooms')}><i className="bi bi-door-closed me-2"></i>Rooms</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/syllabi')}><i className="bi bi-file-earmark-ruled me-2"></i>Syllabi</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/discussions')}><i className="bi bi-chat-square-text me-2"></i>Discussions</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/timetable')}><i className="bi bi-calendar3 me-2"></i>Timetable</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/notifications')}><i className="bi bi-bell me-2"></i>Notifications</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/tickets')}><i className="bi bi-headset me-2"></i>Support Ticket</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
