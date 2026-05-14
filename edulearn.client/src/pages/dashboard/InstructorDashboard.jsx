import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { courseService } from '../../services/courseService';
import { assessmentService } from '../../services/assessmentService';
import { submissionService } from '../../services/submissionService';
import { studentService } from '../../services/studentService';
import Loading from '../../components/Loading';

const TERM = '2026-Spring';

export default function InstructorDashboard() {
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
            const [courses, students, assessments] = await Promise.allSettled([
                courseService.getAll(),
                studentService.getAll(),
                assessmentService.getAll(),
            ]);
            if (courses.status === 'fulfilled') s.courses = (courses.value || []).length;
            if (students.status === 'fulfilled') s.students = (students.value || []).length;
            if (assessments.status === 'fulfilled') {
                const all = assessments.value || [];
                s.assessments = all.length;
                s.published = all.filter(a => a.status === 'Published').length;

                const subResults = await Promise.allSettled(
                    all.map(a => submissionService.getByAssessment(a.assessmentID).catch(() => []))
                );
                const allSubs = subResults.filter(r => r.status === 'fulfilled').flatMap(r => r.value || []);
                s.pendingGrading = allSubs.filter(sub => sub.status === 'Submitted').length;
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
                    <span className="badge" style={{ background: '#EAF3DE', color: '#27500A', fontSize: 13 }}>Instructor</span>
                    <h2 className="mb-0 text-primary-edulearn">Instructor Dashboard</h2>
                </div>
                <small className="text-muted">{today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
            </div>

            <div className="card shadow-sm mb-4 border-0 bg-light">
                <div className="card-body d-flex align-items-center justify-content-between">
                    <div>
                        <h4 className="mb-1">Welcome back, {username}! 👋</h4>
                        <p className="mb-0 text-muted">Term: {TERM} &nbsp;·&nbsp; Role: Instructor</p>
                    </div>
                    <i className="bi bi-display text-muted" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/courses')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">My Courses</div>
                            <div className="display-5 fw-bold" style={{ color: '#3B6D11' }}>{stats.courses ?? '—'}</div>
                            <small className="text-muted">this term</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/students')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Total Students</div>
                            <div className="display-5 fw-bold" style={{ color: '#185FA5' }}>{stats.students ?? '—'}</div>
                            <small className="text-muted">across sections</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/assessments')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Assessments</div>
                            <div className="display-5 fw-bold" style={{ color: '#534AB7' }}>{stats.assessments ?? '—'}</div>
                            <small className="text-muted">{stats.published ?? 0} published</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/submissions')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Pending Grading</div>
                            <div className="display-5 fw-bold" style={{ color: '#854F0B' }}>{stats.pendingGrading ?? '—'}</div>
                            <small className="text-muted">submissions</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/discussions')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Discussions</div>
                            <div className="display-5 fw-bold" style={{ color: '#0F6E56' }}>—</div>
                            <small className="text-muted">open threads</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header bg-light"><strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong></div>
                <div className="card-body">
                    <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/courses/new')}><i className="bi bi-plus me-2"></i>New Course</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/assessments/new')}><i className="bi bi-file-plus me-2"></i>New Assessment</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/submissions')}><i className="bi bi-star me-2"></i>Grade Submissions</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/contents/new')}><i className="bi bi-upload me-2"></i>Upload Content</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/syllabi')}><i className="bi bi-file-earmark-ruled me-2"></i>Syllabi</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/discussions')}><i className="bi bi-chat-square-text me-2"></i>Discussions</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/grade-changes')}><i className="bi bi-arrow-left-right me-2"></i>Grade Changes</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/plagiarism')}><i className="bi bi-shield-exclamation me-2"></i>Plagiarism</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/students')}><i className="bi bi-people me-2"></i>Students</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/notifications')}><i className="bi bi-bell me-2"></i>Notifications</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/tickets')}><i className="bi bi-headset me-2"></i>Support Ticket</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
