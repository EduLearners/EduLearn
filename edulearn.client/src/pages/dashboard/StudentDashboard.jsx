import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { enrollmentService } from '../../services/enrollmentService';
import { submissionService } from '../../services/submissionService';
import { notificationService } from '../../services/notificationService';
import { transcriptService } from '../../services/transcriptService';
import Loading from '../../components/Loading';
import axiosClient from '../../api/axiosClient';

const TERM = '2026-Spring';

export default function StudentDashboard() {
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
            const studentRecord = await axiosClient.get('/students/me').then(r => r.data).catch(() => null);
            const sid = studentRecord?.studentID;
            if (sid) {
                const [enrollments, transcripts, notifications, submissions] = await Promise.allSettled([
                    enrollmentService.getByStudent(sid),
                    transcriptService.getByStudent(sid),
                    notificationService.getAll({ unreadOnly: true }),
                    submissionService.getByStudent(sid),
                ]);
                if (enrollments.status === 'fulfilled') {
                    const d = enrollments.value || [];
                    s.enrolled = d.filter(e => e.status === 'Enrolled').length;
                    s.waitlisted = d.filter(e => e.status === 'Waitlisted').length;
                }
                if (transcripts.status === 'fulfilled') {
                    const d = transcripts.value || [];
                    s.cgpa = d.length > 0 ? d[0].gpa : null;
                }
                if (notifications.status === 'fulfilled') {
                    const d = notifications.value;
                    // Backend returns PaginatedResponseDto: { items: [], totalCount, ... }
                    s.unread = d?.items?.length ?? (Array.isArray(d) ? d.length : 0);
                }
                if (submissions.status === 'fulfilled') {
                    const d = submissions.value || [];
                    s.pendingSubmissions = d.filter(sub => sub.status === 'Submitted').length;
                }
            }
        } catch { }
        setStats(s);
        setLoading(false);
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <span className="badge" style={{ background: '#E6F1FB', color: '#0C447C', fontSize: 13 }}>Student</span>
                    <h2 className="mb-0 text-primary-edulearn">Student Dashboard</h2>
                </div>
                <small className="text-muted">{today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
            </div>

            <div className="card shadow-sm mb-4 border-0 bg-light">
                <div className="card-body d-flex align-items-center justify-content-between">
                    <div>
                        <h4 className="mb-1">Welcome back, {username}! 👋</h4>
                        <p className="mb-0 text-muted">Term: {TERM} &nbsp;·&nbsp; Role: Student</p>
                    </div>
                    <i className="bi bi-mortarboard text-muted" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/enrollment')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Enrolled Courses</div>
                            <div className="display-5 fw-bold" style={{ color: '#185FA5' }}>{stats.enrolled ?? '—'}</div>
                            <small className="text-muted">{stats.waitlisted ?? 0} waitlisted</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/submissions')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Pending Submissions</div>
                            <div className="display-5 fw-bold" style={{ color: '#854F0B' }}>{stats.pendingSubmissions ?? '—'}</div>
                            <small className="text-muted">due this week</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light">
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Latest CGPA</div>
                            <div className="display-5 fw-bold" style={{ color: '#3B6D11' }}>
                                {stats.cgpa != null ? Number(stats.cgpa).toFixed(2) : '—'}
                            </div>
                            <small className="text-muted">out of 10.00</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/invoices')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Pending Invoice</div>
                            <div className="display-5 fw-bold" style={{ color: '#A32D2D' }}>—</div>
                            <small className="text-muted">check invoices</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/notifications')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Notifications</div>
                            <div className="display-5 fw-bold" style={{ color: '#534AB7' }}>{stats.unread ?? '—'}</div>
                            <small className="text-muted">unread</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header bg-light"><strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong></div>
                <div className="card-body">
                    <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/enrollment')}><i className="bi bi-card-checklist me-2"></i>Enroll in Section</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/timetable')}><i className="bi bi-calendar3 me-2"></i>My Timetable</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/assessments')}><i className="bi bi-file-check me-2"></i>My Assessments</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/submissions')}><i className="bi bi-cloud-upload me-2"></i>My Submissions</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/contents')}><i className="bi bi-collection-play me-2"></i>Course Contents</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/syllabi')}><i className="bi bi-file-earmark-ruled me-2"></i>Syllabi</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/discussions')}><i className="bi bi-chat-square-text me-2"></i>Discussions</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/transcripts')}><i className="bi bi-file-earmark-text me-2"></i>My Transcripts</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/invoices')}><i className="bi bi-receipt me-2"></i>My Invoices</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/notifications')}><i className="bi bi-bell me-2"></i>Notifications</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/tickets')}><i className="bi bi-headset me-2"></i>Support Ticket</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
