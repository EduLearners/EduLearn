import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { sectionService } from '../../services/sectionService';
import { enrollmentService } from '../../services/enrollmentService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function StudentsPage() {
    const navigate = useNavigate();
    const { role, userId } = authService.getCurrentUser();

    const canCreate = ['Registrar', 'ITAdmin'].includes(role);
    const isInstructor = role === 'Instructor';

    // All students (for Registrar/ITAdmin)
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Instructor-specific
    const [mySections, setMySections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [sectionStudents, setSectionStudents] = useState([]);  // students from enrollment
    const [loadingSection, setLoadingSection] = useState(false);
    const [loadingSections, setLoadingSections] = useState(false);

    // Shared filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        if (isInstructor && userId) {
            loadMySections();
        } else {
            loadStudents();
        }
    }, []);

    // ── Load ALL students (Registrar / ITAdmin) ──
    const loadStudents = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await studentService.getAll();
            setStudents(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Load instructor's sections ──
    const loadMySections = async () => {
        try {
            setLoadingSections(true);
            const data = await sectionService.getByInstructor(userId);
            setMySections(data || []);
        } catch {
            setMySections([]);
        } finally {
            setLoadingSections(false);
            setLoading(false);
        }
    };

    // ── When instructor selects section, load enrolled students ──
    const handleSectionChange = async (e) => {
        const sectionId = e.target.value;
        setSelectedSection(sectionId);
        setSectionStudents([]);
        setSearch('');

        if (!sectionId) return;
        try {
            setLoadingSection(true);
            setError(null);
            const enrollments = await enrollmentService.getBySection(sectionId);
            // Only active enrollments
            const active = (enrollments || []).filter(en => en.status === 'Enrolled');
            // Get full student records for each
            const studentResults = await Promise.allSettled(
                active.map(en => studentService.getById(en.studentID).catch(() => null))
            );
            const sts = studentResults
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => r.value);
            setSectionStudents(sts);
        } catch (err) {
            setError(err);
        } finally {
            setLoadingSection(false);
        }
    };

    const parseSchedule = (json) => {
        try { return json ? JSON.parse(json) : null; } catch { return null; }
    };

    // ── Filter the student list ──
    const activeList = isInstructor ? sectionStudents : students;
    const filteredStudents = useMemo(() => {
        return activeList.filter(s => {
            if (statusFilter !== 'All' && s.enrollmentStatus !== statusFilter) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                return s.name?.toLowerCase().includes(q) || s.mrn?.toLowerCase().includes(q);
            }
            return true;
        });
    }, [activeList, search, statusFilter]);

    // ── INSTRUCTOR VIEW ──────────────────────────────────────────────────────────
    if (isInstructor) {
        return (
            <div>
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h2 className="text-primary-edulearn mb-0">
                        <i className="bi bi-people me-2"></i>My Section Students
                    </h2>
                </div>

                {/* Section selector */}
                <div className="card shadow-sm mb-3">
                    <div className="card-body">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-8">
                                <label className="form-label fw-bold">
                                    <i className="bi bi-collection me-1"></i>Select Your Section
                                </label>
                                {loadingSections ? (
                                    <div className="d-flex align-items-center gap-2 text-muted mt-1">
                                        <span className="spinner-border spinner-border-sm"></span>
                                        <small>Loading your sections...</small>
                                    </div>
                                ) : (
                                    <select
                                        className="form-select"
                                        value={selectedSection}
                                        onChange={handleSectionChange}
                                    >
                                        <option value="">— Select a section to view students —</option>
                                        {mySections.map(s => {
                                            const sched = parseSchedule(s.scheduleJSON);
                                            return (
                                                <option key={s.sectionID} value={s.sectionID}>
                                                    {s.courseName} — Section #{s.sectionID}
                                                    {sched ? ` · ${sched.days} ${sched.time}` : ''}
                                                    {` · ${s.enrolledCount} enrolled`}
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                                {!loadingSections && mySections.length === 0 && (
                                    <small className="text-warning d-block mt-1">
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        No sections assigned to you.
                                    </small>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    <i className="bi bi-search me-1"></i>Search
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by name or MRN..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    disabled={!selectedSection}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <ErrorAlert error={error} onDismiss={() => setError(null)} />

                {loadingSection && <Loading message="Loading students in this section..." />}

                {/* No section selected */}
                {!selectedSection && !loadingSection && (
                    <div className="card shadow-sm">
                        <div className="card-body text-center py-5 text-muted">
                            <i className="bi bi-collection display-4 d-block mb-3 opacity-25"></i>
                            <p className="mb-0">Select a section above to view enrolled students.</p>
                        </div>
                    </div>
                )}

                {/* Section selected, students loaded */}
                {selectedSection && !loadingSection && (
                    <div className="card shadow-sm">
                        <div className="card-header bg-light d-flex align-items-center justify-content-between">
                            <strong>
                                <i className="bi bi-people me-2"></i>
                                Enrolled Students
                            </strong>
                            <small className="text-muted">
                                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                            </small>
                        </div>
                        <div className="card-body p-0">
                            {filteredStudents.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <i className="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>
                                    <p className="mb-0">
                                        {sectionStudents.length === 0
                                            ? 'No enrolled students in this section.'
                                            : 'No students match your search.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="bg-primary-edulearn text-white">
                                            <tr>
                                                <th>MRN</th>
                                                <th>Name</th>
                                                <th>Gender</th>
                                                <th>Program</th>
                                                <th>Status</th>
                                                <th className="text-end pe-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.map(s => (
                                                <tr key={s.studentID}>
                                                    <td><code className="small">{s.mrn}</code></td>
                                                    <td className="fw-bold">{s.name}</td>
                                                    <td>{s.gender || '—'}</td>
                                                    <td>{s.programID || '—'}</td>
                                                    <td><StatusBadge status={s.enrollmentStatus} /></td>
                                                    <td className="text-end pe-3">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => navigate(`/students/${s.studentID}`)}
                                                        >
                                                            <i className="bi bi-eye me-1"></i>View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── REGISTRAR / ITADMIN VIEW ─────────────────────────────────────────────────
    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-people me-2"></i>Students
                </h2>
                {canCreate && (
                    <button className="btn btn-primary-edulearn" onClick={() => navigate('/registrar/students/new')}>
                        <i className="bi bi-plus-lg me-2"></i>Add Student
                    </button>
                )}
            </div>

            <div className="card shadow-sm mb-3">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                            <label className="form-label fw-bold">
                                <i className="bi bi-search me-1"></i>Search
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by name or MRN..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">
                                <i className="bi bi-funnel me-1"></i>Status
                            </label>
                            <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="All">All</option>
                                <option value="Active">Active</option>
                                <option value="Graduated">Graduated</option>
                                <option value="Withdrawn">Withdrawn</option>
                                <option value="Suspended">Suspended</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <button className="btn btn-outline-secondary w-100" onClick={loadStudents} disabled={loading}>
                                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading students..." />}

            {!loading && (
                <div className="card shadow-sm">
                    <div className="card-body p-0">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-0">
                                    {students.length === 0 ? 'No students found.' : 'No students match your filters.'}
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="bg-primary-edulearn text-white">
                                        <tr>
                                            <th>MRN</th>
                                            <th>Name</th>
                                            <th>Gender</th>
                                            <th>Program ID</th>
                                            <th>Entry Term</th>
                                            <th>Expected Grad</th>
                                            <th>Status</th>
                                            <th className="text-end pe-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map(s => (
                                            <tr key={s.studentID}>
                                                <td><code className="small">{s.mrn}</code></td>
                                                <td className="fw-bold">{s.name}</td>
                                                <td>{s.gender || '—'}</td>
                                                <td>{s.programID || '—'}</td>
                                                <td>{s.entryTerm || '—'}</td>
                                                <td>{s.expectedGraduationTerm || '—'}</td>
                                                <td><StatusBadge status={s.enrollmentStatus} /></td>
                                                <td className="text-end pe-3">
                                                    <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/students/${s.studentID}`)}>
                                                        <i className="bi bi-eye me-1"></i>View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {filteredStudents.length > 0 && (
                        <div className="card-footer text-muted small">
                            Showing {filteredStudents.length} of {students.length} students
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
