import { NavLink } from 'react-router-dom';
import { authService } from '../../services/authService';

const NAV_ITEMS = [
    // ── General ──
    { label: 'Dashboard',     to: '/dashboard',     icon: 'speedometer2',           roles: ['*'] },

    // ── Student ──
    // Can: view enrollments, timetable, assessments, submit, view submissions,
    //      transcripts, invoices, contents, syllabi, discussions, notifications, tickets
    { label: 'Enrollment',    to: '/enrollment',    icon: 'card-checklist',         roles: ['Student'] },
    { label: 'Timetable',     to: '/timetable',     icon: 'calendar3',              roles: ['Student'] },
    { label: 'Courses',       to: '/courses',       icon: 'book',                   roles: ['Student'] },
    { label: 'Assessments',   to: '/assessments',   icon: 'file-earmark-check',     roles: ['Student'] },
    { label: 'Submissions',   to: '/submissions',   icon: 'cloud-upload',           roles: ['Student'] },
    { label: 'Contents',      to: '/contents',      icon: 'collection-play',        roles: ['Student'] },
    { label: 'Syllabus',      to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['Student'] },
    { label: 'Discussions',   to: '/discussions',   icon: 'chat-square-text',       roles: ['Student'] },
    { label: 'Transcripts',   to: '/transcripts',   icon: 'file-earmark-text',      roles: ['Student'] },
    { label: 'Invoices',      to: '/invoices',      icon: 'receipt',                roles: ['Student'] },
    { label: 'Programs',      to: '/programs',      icon: 'mortarboard',            roles: ['Student'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Student'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Student'] },

    // ── Instructor ──
    // Can: view/create/update courses, assessments, submissions, grade, contents,
    //      syllabi, discussions (moderate), grade changes, plagiarism, students, transcripts
    { label: 'Courses',       to: '/courses',       icon: 'book',                   roles: ['Instructor'] },
    { label: 'Assessments',   to: '/assessments',   icon: 'file-earmark-check',     roles: ['Instructor'] },
    { label: 'Submissions',   to: '/submissions',   icon: 'cloud-upload',           roles: ['Instructor'] },
    { label: 'Grade Changes', to: '/grade-changes', icon: 'arrow-left-right',       roles: ['Instructor'] },
    { label: 'Contents',      to: '/contents',      icon: 'collection-play',        roles: ['Instructor'] },
    { label: 'Syllabus',      to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['Instructor'] },
    { label: 'Discussions',   to: '/discussions',   icon: 'chat-square-text',       roles: ['Instructor'] },
    { label: 'Students',      to: '/students',      icon: 'people',                 roles: ['Instructor'] },
    { label: 'Timetable',     to: '/timetable',     icon: 'calendar3',              roles: ['Instructor'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Instructor'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Instructor'] },

    // ── Registrar ──
    // Can: applicants, students, sections, enrollment, transcripts, plagiarism,
    //      courses, syllabi, discussions, timetable, programs, notifications, tickets
    { label: 'Applicants',    to: '/applicants',    icon: 'person-plus',            roles: ['Registrar'] },
    { label: 'Students',      to: '/students',      icon: 'people',                 roles: ['Registrar'] },
    { label: 'Sections',      to: '/sections',      icon: 'collection',             roles: ['Registrar'] },
    { label: 'Enrollment',    to: '/enrollment',    icon: 'card-checklist',         roles: ['Registrar'] },
    { label: 'Transcripts',   to: '/transcripts',   icon: 'file-earmark-text',      roles: ['Registrar'] },
    { label: 'Courses',       to: '/courses',       icon: 'book',                   roles: ['Registrar'] },
    { label: 'Syllabus',      to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['Registrar'] },
    { label: 'Discussions',   to: '/discussions',   icon: 'chat-square-text',       roles: ['Registrar'] },
    { label: 'Timetable',     to: '/timetable',     icon: 'calendar3',              roles: ['Registrar'] },
    { label: 'Programs',      to: '/programs',      icon: 'mortarboard',            roles: ['Registrar'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Registrar'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Registrar'] },

    // ── DeptAdmin ──
    // Can: programs, courses, sections, rooms, syllabi, discussions, timetable,
    //      section roster, notifications, tickets
    { label: 'Programs',      to: '/programs',      icon: 'mortarboard',            roles: ['DeptAdmin'] },
    { label: 'Courses',       to: '/courses',       icon: 'book',                   roles: ['DeptAdmin'] },
    { label: 'Sections',      to: '/sections',      icon: 'collection',             roles: ['DeptAdmin'] },
    { label: 'Rooms',         to: '/rooms',         icon: 'door-closed',            roles: ['DeptAdmin'] },
    { label: 'Syllabus',      to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['DeptAdmin'] },
    { label: 'Discussions',   to: '/discussions',   icon: 'chat-square-text',       roles: ['DeptAdmin'] },
    // phase4-fix-17: Timetable removed for DeptAdmin — EnrollmentViewPolicy excludes DeptAdmin
    // and the backend returns 403. Backend policy extension deferred to post-sprint.
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['DeptAdmin'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['DeptAdmin'] },

    // ── Finance ──
    // Can: fees, invoices, payments, scholarships, notifications, tickets
    { label: 'Fees',          to: '/fees',          icon: 'cash-stack',             roles: ['Finance'] },
    { label: 'Invoices',      to: '/invoices',      icon: 'receipt',                roles: ['Finance'] },
    { label: 'Payments',      to: '/payments',      icon: 'credit-card',            roles: ['Finance'] },
    { label: 'Scholarships',  to: '/scholarships',  icon: 'award',                  roles: ['Finance'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Finance'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Finance'] },

    // ── Auditor ──
    // Can: reports, KPIs, audit log, grade changes, tickets, notifications (read-only)
    { label: 'Reports',       to: '/reports',       icon: 'file-earmark-bar-graph', roles: ['Auditor'] },
    { label: 'KPIs',          to: '/kpis',          icon: 'bar-chart-line',         roles: ['Auditor'] },
    { label: 'Audit Log',     to: '/audit-log',     icon: 'journal-text',           roles: ['Auditor'] },
    { label: 'Grade Changes', to: '/grade-changes', icon: 'arrow-left-right',       roles: ['Auditor'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Auditor'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Auditor'] },

    // ── ITAdmin — sees everything ──
    { label: 'Users',         to: '/users',         icon: 'person-badge',           roles: ['ITAdmin'] },
    { label: 'Applicants',    to: '/applicants',    icon: 'person-plus',            roles: ['ITAdmin'] },
    { label: 'Students',      to: '/students',      icon: 'people',                 roles: ['ITAdmin'] },
    { label: 'Sections',      to: '/sections',      icon: 'collection',             roles: ['ITAdmin'] },
    { label: 'Rooms',         to: '/rooms',         icon: 'door-closed',            roles: ['ITAdmin'] },
    { label: 'Enrollment',    to: '/enrollment',    icon: 'card-checklist',         roles: ['ITAdmin'] },
    { label: 'Timetable',     to: '/timetable',     icon: 'calendar3',              roles: ['ITAdmin'] },
    { label: 'Transcripts',   to: '/transcripts',   icon: 'file-earmark-text',      roles: ['ITAdmin'] },
    { label: 'Programs',      to: '/programs',      icon: 'mortarboard',            roles: ['ITAdmin'] },
    { label: 'Courses',       to: '/courses',       icon: 'book',                   roles: ['ITAdmin'] },
    { label: 'Syllabus',      to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['ITAdmin'] },
    { label: 'Discussions',   to: '/discussions',   icon: 'chat-square-text',       roles: ['ITAdmin'] },
    { label: 'Assessments',   to: '/assessments',   icon: 'file-earmark-check',     roles: ['ITAdmin'] },
    { label: 'Submissions',   to: '/submissions',   icon: 'cloud-upload',           roles: ['ITAdmin'] },
    { label: 'Grade Changes', to: '/grade-changes', icon: 'arrow-left-right',       roles: ['ITAdmin'] },
    { label: 'Contents',      to: '/contents',      icon: 'collection-play',        roles: ['ITAdmin'] },
    { label: 'Fees',          to: '/fees',          icon: 'cash-stack',             roles: ['ITAdmin'] },
    { label: 'Invoices',      to: '/invoices',      icon: 'receipt',                roles: ['ITAdmin'] },
    { label: 'Payments',      to: '/payments',      icon: 'credit-card',            roles: ['ITAdmin'] },
    { label: 'Scholarships',  to: '/scholarships',  icon: 'award',                  roles: ['ITAdmin'] },
    { label: 'Reports',       to: '/reports',       icon: 'file-earmark-bar-graph', roles: ['ITAdmin'] },
    { label: 'KPIs',          to: '/kpis',          icon: 'bar-chart-line',         roles: ['ITAdmin'] },
    { label: 'Audit Log',     to: '/audit-log',     icon: 'journal-text',           roles: ['ITAdmin'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['ITAdmin'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['ITAdmin'] },
    { label: 'Errors',        to: '/admin/errors',  icon: 'bug',                    roles: ['ITAdmin'] },
];

export default function Sidebar() {
    const { role } = authService.getCurrentUser();
    const visible = NAV_ITEMS.filter(i => i.roles.includes('*') || i.roles.includes(role));

    return (
        <div className="bg-white border-end" style={{ minHeight: '100%' }}>
            <ul className="nav flex-column p-3">
                {visible.map(item => (
                    <li key={item.to} className="nav-item mb-1">
                        <NavLink
                            to={item.to}
                            className={({ isActive }) =>
                                `nav-link d-flex align-items-center ${isActive ? 'bg-primary-edulearn text-white rounded' : 'text-dark'}`
                            }
                        >
                            <i className={`bi bi-${item.icon} me-2`}></i>
                            {item.label}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </div>
    );
}