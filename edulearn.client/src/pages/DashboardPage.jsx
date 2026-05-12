import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { applicantService } from '../services/applicantService';
import { studentService } from '../services/studentService';
import { roomService } from '../services/roomService';
import { transcriptService } from '../services/transcriptService';
import { enrollmentService } from '../services/enrollmentService';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';

export default function DashboardPage() {
    const { username, role } = authService.getCurrentUser();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        applicants: null,
        students: null,
        rooms: null,
        enrollments: null,
        transcripts: null,
    });
    const [recentApplicants, setRecentApplicants] = useState([]);
    const [loading, setLoading] = useState(true);

    const isStudent = role === 'Student';
    const isRegistrar = role === 'Registrar';
    const isITAdmin = role === 'ITAdmin';
    const isInstructor = role === 'Instructor';
    const canViewApplicants = isRegistrar || isITAdmin;
    const canViewStudents = isRegistrar || isITAdmin || isInstructor;
    const canViewRooms = true; // all roles can view rooms

    const today = new Date();
    const currentTerm = '2026-Spring'; // hard-coded current term

    useEffect(() => {
        loadStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadStats = async () => {
        setLoading(true);
        const results = {};

        // Fire all calls in parallel — failures are caught individually so one bad call doesn't break the dashboard
        const promises = [];

        if (canViewApplicants) {
            promises.push(
                applicantService.getAll()
                    .then(data => {
                        results.applicants = {
                            total: data.length,
                            submitted: data.filter(a => a.applicationStatus === 'Submitted').length,
                            underReview: data.filter(a => a.applicationStatus === 'UnderReview').length,
                            accepted: data.filter(a => a.applicationStatus === 'Accepted').length,
                            rejected: data.filter(a => a.applicationStatus === 'Rejected').length,
                        };
                        // Latest 5 by submitted date
                        setRecentApplicants(
                            [...data]
                                .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                                .slice(0, 5)
                        );
                    })
                    .catch(() => { results.applicants = { error: true }; })
            );
        }

        if (canViewStudents) {
            promises.push(
                studentService.getAll()
                    .then(data => {
                        results.students = {
                            total: data.length,
                            active: data.filter(s => s.enrollmentStatus === 'Active').length,
                            graduated: data.filter(s => s.enrollmentStatus === 'Graduated').length,
                        };
                    })
                    .catch(() => { results.students = { error: true }; })
            );
        }

        if (canViewRooms) {
            promises.push(
                roomService.getAll()
                    .then(data => {
                        results.rooms = {
                            total: data.length,
                            available: data.filter(r => r.status === 'Available').length,
                            totalCapacity: data.reduce((sum, r) => sum + (r.capacity || 0), 0),
                        };
                    })
                    .catch(() => { results.rooms = { error: true }; })
            );
        }

        // Student-specific: own enrollments
        if (isStudent) {
            const lastStudentId = localStorage.getItem('lastStudentId');
            if (lastStudentId) {
                promises.push(
                    enrollmentService.getByStudent(lastStudentId)
                        .then(data => {
                            results.enrollments = {
                                total: data.length,
                                enrolled: data.filter(e => e.status === 'Enrolled').length,
                                waitlisted: data.filter(e => e.status === 'Waitlisted').length,
                            };
                        })
                        .catch(() => { results.enrollments = { error: true }; })
                );

                promises.push(
                    transcriptService.getByStudent(lastStudentId)
                        .then(data => {
                            results.transcripts = {
                                total: data.length,
                                issued: data.filter(t => t.status === 'Issued').length,
                                latestGpa: data.length > 0 ? data[0].gpa : null,
                            };
                        })
                        .catch(() => { results.transcripts = { error: true }; })
                );
            }
        }

        await Promise.allSettled(promises);
        setStats(results);
        setLoading(false);
    };

    // ── Render ──

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-speedometer2 me-2"></i>Dashboard
                </h2>
                <small className="text-muted">
                    <i className="bi bi-calendar3 me-1"></i>
                    {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </small>
            </div>

            {/* Welcome banner */}
            <div className="card shadow-sm mb-4 border-0" style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #2c5aa0 100%)' }}>
                <div className="card-body text-white p-4">
                    <div className="row align-items-center">
                        <div className="col-md-8">
                            <h3 className="mb-1">Welcome back, {username}! 👋</h3>
                            <p className="mb-0 opacity-75">
                                You're signed in as <strong>{role}</strong>.
                                Current term: <strong>{currentTerm}</strong>.
                            </p>
                        </div>
                        <div className="col-md-4 text-end">
                            <i className="bi bi-mortarboard-fill" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
                        </div>
                    </div>
                </div>
            </div>

            {loading && <Loading message="Loading your dashboard..." />}

            {!loading && (
                <>
                    {/* KPI cards */}
                    <div className="row g-3 mb-4">
                        {/* Applicants — Registrar/ITAdmin */}
                        {canViewApplicants && stats.applicants && !stats.applicants.error && (
                            <div className="col-md-3 col-sm-6">
                                <div
                                    className="card shadow-sm h-100 border-0"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate('/applicants')}
                                >
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small text-uppercase">Applicants</div>
                                                <div className="display-5 fw-bold text-primary-edulearn">
                                                    {stats.applicants.total}
                                                </div>
                                                <small className="text-warning">
                                                    {stats.applicants.submitted} pending review
                                                </small>
                                            </div>
                                            <div
                                                style={{
                                                    width: 56, height: 56, borderRadius: '50%',
                                                    backgroundColor: '#1a3c6e15',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <i className="bi bi-person-plus text-primary-edulearn" style={{ fontSize: '1.75rem' }}></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Students */}
                        {canViewStudents && stats.students && !stats.students.error && (
                            <div className="col-md-3 col-sm-6">
                                <div
                                    className="card shadow-sm h-100 border-0"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate('/students')}
                                >
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small text-uppercase">Students</div>
                                                <div className="display-5 fw-bold text-success">
                                                    {stats.students.total}
                                                </div>
                                                <small className="text-success">
                                                    {stats.students.active} active
                                                </small>
                                            </div>
                                            <div
                                                style={{
                                                    width: 56, height: 56, borderRadius: '50%',
                                                    backgroundColor: '#19875415',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <i className="bi bi-people text-success" style={{ fontSize: '1.75rem' }}></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rooms */}
                        {canViewRooms && stats.rooms && !stats.rooms.error && (
                            <div className="col-md-3 col-sm-6">
                                <div
                                    className="card shadow-sm h-100 border-0"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate('/rooms')}
                                >
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small text-uppercase">Rooms</div>
                                                <div className="display-5 fw-bold" style={{ color: '#e2a94b' }}>
                                                    {stats.rooms.total}
                                                </div>
                                                <small className="text-muted">
                                                    {stats.rooms.totalCapacity} total seats
                                                </small>
                                            </div>
                                            <div
                                                style={{
                                                    width: 56, height: 56, borderRadius: '50%',
                                                    backgroundColor: '#e2a94b15',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <i className="bi bi-door-closed" style={{ fontSize: '1.75rem', color: '#e2a94b' }}></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Student-specific: enrollments */}
                        {isStudent && stats.enrollments && !stats.enrollments.error && (
                            <div className="col-md-3 col-sm-6">
                                <div
                                    className="card shadow-sm h-100 border-0"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate('/enrollment')}
                                >
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small text-uppercase">My Enrollments</div>
                                                <div className="display-5 fw-bold text-success">
                                                    {stats.enrollments.enrolled}
                                                </div>
                                                {stats.enrollments.waitlisted > 0 && (
                                                    <small className="text-warning">
                                                        {stats.enrollments.waitlisted} on waitlist
                                                    </small>
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    width: 56, height: 56, borderRadius: '50%',
                                                    backgroundColor: '#19875415',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <i className="bi bi-card-checklist text-success" style={{ fontSize: '1.75rem' }}></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Student-specific: GPA */}
                        {isStudent && stats.transcripts && !stats.transcripts.error && (
                            <div className="col-md-3 col-sm-6">
                                <div className="card shadow-sm h-100 border-0">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small text-uppercase">Latest CGPA</div>
                                                <div className="display-5 fw-bold text-primary-edulearn">
                                                    {stats.transcripts.latestGpa != null
                                                        ? stats.transcripts.latestGpa.toFixed(2)
                                                        : '—'}
                                                </div>
                                                <small className="text-muted">
                                                    out of 10.00
                                                </small>
                                            </div>
                                            <div
                                                style={{
                                                    width: 56, height: 56, borderRadius: '50%',
                                                    backgroundColor: '#1a3c6e15',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <i className="bi bi-file-earmark-text text-primary-edulearn" style={{ fontSize: '1.75rem' }}></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick info card (always shown) */}
                        <div className="col-md-3 col-sm-6">
                            <div className="card shadow-sm h-100 border-0">
                                <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div>
                                            <div className="text-muted small text-uppercase">Current Term</div>
                                            <div className="display-6 fw-bold text-primary-edulearn">
                                                {currentTerm.split('-')[1]}
                                            </div>
                                            <small className="text-muted">{currentTerm.split('-')[0]}</small>
                                        </div>
                                        <div
                                            style={{
                                                width: 56, height: 56, borderRadius: '50%',
                                                backgroundColor: '#1a3c6e15',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            <i className="bi bi-calendar3 text-primary-edulearn" style={{ fontSize: '1.75rem' }}></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Two-column area */}
                    <div className="row g-3">
                        {/* Recent Applicants — Registrar/ITAdmin */}
                        {canViewApplicants && recentApplicants.length > 0 && (
                            <div className="col-lg-7">
                                <div className="card shadow-sm h-100">
                                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                                        <strong>
                                            <i className="bi bi-clock-history me-2"></i>
                                            Recent Applicants
                                        </strong>
                                        <button
                                            className="btn btn-sm btn-link p-0"
                                            onClick={() => navigate('/applicants')}
                                        >
                                            View all <i className="bi bi-arrow-right"></i>
                                        </button>
                                    </div>
                                    <div className="list-group list-group-flush">
                                        {recentApplicants.map(a => (
                                            <div
                                                key={a.applicantID}
                                                className="list-group-item list-group-item-action"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => navigate(`/applicants/${a.applicantID}`)}
                                            >
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <div>
                                                        <div className="fw-bold">{a.name}</div>
                                                        <small className="text-muted">
                                                            <i className="bi bi-mortarboard me-1"></i>{a.programApplied}
                                                            <span className="mx-2">·</span>
                                                            <i className="bi bi-clock me-1"></i>
                                                            {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '—'}
                                                        </small>
                                                    </div>
                                                    <StatusBadge status={a.applicationStatus} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick actions */}
                        <div className={canViewApplicants && recentApplicants.length > 0 ? 'col-lg-5' : 'col-12'}>
                            <div className="card shadow-sm h-100">
                                <div className="card-header bg-light">
                                    <strong>
                                        <i className="bi bi-lightning me-2"></i>
                                        Quick Actions
                                    </strong>
                                </div>
                                <div className="card-body">
                                    <div className="d-grid gap-2">
                                        {canViewApplicants && (
                                            <button
                                                className="btn btn-outline-primary text-start"
                                                onClick={() => navigate('/applicants/new')}
                                            >
                                                <i className="bi bi-person-plus me-2"></i>
                                                New Applicant
                                            </button>
                                        )}
                                        {(isRegistrar || isITAdmin) && (
                                            <button
                                                className="btn btn-outline-primary text-start"
                                                onClick={() => navigate('/students/new')}
                                            >
                                                <i className="bi bi-plus-lg me-2"></i>
                                                Add Student
                                            </button>
                                        )}
                                        {(isRegistrar || isITAdmin) && (
                                            <button
                                                className="btn btn-outline-primary text-start"
                                                onClick={() => navigate('/sections')}
                                            >
                                                <i className="bi bi-collection me-2"></i>
                                                Manage Sections
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-outline-primary text-start"
                                            onClick={() => navigate('/enrollment')}
                                        >
                                            <i className="bi bi-card-checklist me-2"></i>
                                            {isStudent ? 'Browse & Enroll' : 'Enrollment Management'}
                                        </button>
                                        <button
                                            className="btn btn-outline-primary text-start"
                                            onClick={() => navigate('/timetable')}
                                        >
                                            <i className="bi bi-calendar3 me-2"></i>
                                            View Timetable
                                        </button>
                                        <button
                                            className="btn btn-outline-primary text-start"
                                            onClick={() => navigate('/transcripts')}
                                        >
                                            <i className="bi bi-file-earmark-text me-2"></i>
                                            {isStudent ? 'My Transcripts' : 'Transcripts'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Empty-data fallback when nothing loaded */}
                    {!loading && !stats.applicants && !stats.students && !stats.rooms && !stats.enrollments && (
                        <div className="alert alert-info mt-4">
                            <i className="bi bi-info-circle me-2"></i>
                            No data available yet. Use the sidebar or quick actions above to get started.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
