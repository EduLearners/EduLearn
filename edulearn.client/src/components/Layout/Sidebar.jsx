import { NavLink }   from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRole }  from '../../store/authSlice';

// ── Spec-compliant nav items per role ──────────────────────────────────────────
// Routes use the namespaced paths defined in App.jsx (Phase 1 fix).
// Each entry: { label, to, icon, roles }
// roles: ['*'] = visible to all authenticated users

const NAV_ITEMS = [
  // ── General ────────────────────────────────────────────────────────────────
  { label: 'Dashboard', to: '/dashboard', icon: 'speedometer2', roles: ['*'] },

  // ── Student ────────────────────────────────────────────────────────────────
  { label: 'Enrollment',    to: '/registrar/enrollment', icon: 'card-checklist',     roles: ['Student'] },
  { label: 'Timetable',     to: '/student/timetable',    icon: 'calendar3',           roles: ['Student'] },
  { label: 'Courses',       to: '/courses',              icon: 'book',                roles: ['Student'] },
  { label: 'Assessments',   to: '/assessments',          icon: 'file-earmark-check',  roles: ['Student'] },
  { label: 'Submissions',   to: '/submissions',          icon: 'cloud-upload',        roles: ['Student'] },
  { label: 'Contents',      to: '/contents',             icon: 'collection-play',     roles: ['Student'] },
  { label: 'Syllabi',       to: '/syllabi',              icon: 'file-earmark-ruled',  roles: ['Student'] },
  { label: 'Discussions',   to: '/discussions',          icon: 'chat-square-text',    roles: ['Student'] },
  { label: 'Transcripts',   to: '/student/transcript',   icon: 'file-earmark-text',   roles: ['Student'] },
  { label: 'Invoices',      to: '/finance/invoices',     icon: 'receipt',             roles: ['Student'] },
  { label: 'Programs',      to: '/programs',             icon: 'mortarboard',         roles: ['Student'] },
  { label: 'Notifications', to: '/notifications',        icon: 'bell',                roles: ['Student'] },
  { label: 'Tickets',       to: '/tickets',              icon: 'headset',             roles: ['Student'] },

  // ── Instructor ─────────────────────────────────────────────────────────────
  { label: 'Courses',       to: '/courses',                      icon: 'book',                roles: ['Instructor'] },
  { label: 'Assessments',   to: '/assessments',                  icon: 'file-earmark-check',  roles: ['Instructor'] },
  { label: 'Submissions',   to: '/submissions',                  icon: 'cloud-upload',        roles: ['Instructor'] },
  { label: 'Grade Changes', to: '/grade-changes',                icon: 'arrow-left-right',    roles: ['Instructor'] },
  { label: 'Contents',      to: '/teaching/content',             icon: 'collection-play',     roles: ['Instructor'] },
  { label: 'Syllabi',       to: '/syllabi',                      icon: 'file-earmark-ruled',  roles: ['Instructor'] },
  { label: 'Discussions',   to: '/discussions',                  icon: 'chat-square-text',    roles: ['Instructor'] },
  { label: 'Plagiarism',    to: '/admin/plagiarism/queue',       icon: 'shield-exclamation',  roles: ['Instructor'] },
  { label: 'Students',      to: '/registrar/students',           icon: 'people',              roles: ['Instructor'] },
  { label: 'Timetable',     to: '/student/timetable',            icon: 'calendar3',           roles: ['Instructor'] },
  { label: 'Notifications', to: '/notifications',                icon: 'bell',                roles: ['Instructor'] },
  { label: 'Tickets',       to: '/tickets',                      icon: 'headset',             roles: ['Instructor'] },

  // ── Registrar ──────────────────────────────────────────────────────────────
  { label: 'Applicants',    to: '/registrar/applicants',         icon: 'person-plus',         roles: ['Registrar'] },
  { label: 'Students',      to: '/registrar/students',           icon: 'people',              roles: ['Registrar'] },
  { label: 'Sections',      to: '/sections',                     icon: 'collection',          roles: ['Registrar'] },
  { label: 'Enrollment',    to: '/registrar/enrollment',         icon: 'card-checklist',      roles: ['Registrar'] },
  { label: 'Transcripts',   to: '/registrar/transcripts/issue',  icon: 'file-earmark-text',   roles: ['Registrar'] },
  { label: 'Plagiarism',    to: '/admin/plagiarism/queue',       icon: 'shield-exclamation',  roles: ['Registrar'] },
  { label: 'Courses',       to: '/courses',                      icon: 'book',                roles: ['Registrar'] },
  { label: 'Syllabi',       to: '/syllabi',                      icon: 'file-earmark-ruled',  roles: ['Registrar'] },
  { label: 'Discussions',   to: '/discussions',                  icon: 'chat-square-text',    roles: ['Registrar'] },
  { label: 'Timetable',     to: '/student/timetable',            icon: 'calendar3',           roles: ['Registrar'] },
  { label: 'Programs',      to: '/programs',                     icon: 'mortarboard',         roles: ['Registrar'] },
  { label: 'Notifications', to: '/notifications',                icon: 'bell',                roles: ['Registrar'] },
  { label: 'Tickets',       to: '/tickets',                      icon: 'headset',             roles: ['Registrar'] },

  // ── DeptAdmin ──────────────────────────────────────────────────────────────
  { label: 'Programs',      to: '/programs',             icon: 'mortarboard',        roles: ['DeptAdmin'] },
  { label: 'Courses',       to: '/courses',              icon: 'book',               roles: ['DeptAdmin'] },
  { label: 'Sections',      to: '/sections',             icon: 'collection',         roles: ['DeptAdmin'] },
  { label: 'Rooms',         to: '/rooms',                icon: 'door-closed',        roles: ['DeptAdmin'] },
  { label: 'Syllabi',       to: '/syllabi',              icon: 'file-earmark-ruled', roles: ['DeptAdmin'] },
  { label: 'Discussions',   to: '/discussions',          icon: 'chat-square-text',   roles: ['DeptAdmin'] },
  { label: 'Timetable',     to: '/student/timetable',   icon: 'calendar3',           roles: ['DeptAdmin'] },
  { label: 'Notifications', to: '/notifications',        icon: 'bell',               roles: ['DeptAdmin'] },
  { label: 'Tickets',       to: '/tickets',              icon: 'headset',            roles: ['DeptAdmin'] },

  // ── Finance ────────────────────────────────────────────────────────────────
  { label: 'Fees',          to: '/finance/fees',         icon: 'cash-stack',   roles: ['Finance'] },
  { label: 'Invoices',      to: '/finance/invoices',     icon: 'receipt',      roles: ['Finance'] },
  { label: 'Payments',      to: '/finance/payments',     icon: 'credit-card',  roles: ['Finance'] },
  { label: 'Scholarships',  to: '/finance/scholarships', icon: 'award',        roles: ['Finance'] },
  { label: 'Notifications', to: '/notifications',        icon: 'bell',         roles: ['Finance'] },
  { label: 'Tickets',       to: '/tickets',              icon: 'headset',      roles: ['Finance'] },

  // ── Auditor ────────────────────────────────────────────────────────────────
  { label: 'Reports',       to: '/admin/reports',        icon: 'file-earmark-bar-graph', roles: ['Auditor'] },
  { label: 'KPIs',          to: '/admin/kpis',           icon: 'bar-chart-line',         roles: ['Auditor'] },
  { label: 'Audit Log',     to: '/admin/audit-log',      icon: 'journal-text',           roles: ['Auditor'] },
  { label: 'Audit Packages',to: '/admin/audit-packages', icon: 'archive',                roles: ['Auditor'] },
  { label: 'Grade Changes', to: '/grade-changes',        icon: 'arrow-left-right',       roles: ['Auditor'] },
  { label: 'Notifications', to: '/notifications',        icon: 'bell',                   roles: ['Auditor'] },
  { label: 'Tickets',       to: '/tickets',              icon: 'headset',                roles: ['Auditor'] },

  // ── ITAdmin — sees everything ───────────────────────────────────────────────
  { label: 'Users',          to: '/admin/users',              icon: 'person-badge',           roles: ['ITAdmin'] },
  { label: 'Applicants',     to: '/registrar/applicants',     icon: 'person-plus',            roles: ['ITAdmin'] },
  { label: 'Students',       to: '/registrar/students',       icon: 'people',                 roles: ['ITAdmin'] },
  { label: 'Sections',       to: '/sections',                 icon: 'collection',             roles: ['ITAdmin'] },
  { label: 'Rooms',          to: '/rooms',                    icon: 'door-closed',            roles: ['ITAdmin'] },
  { label: 'Enrollment',     to: '/registrar/enrollment',     icon: 'card-checklist',         roles: ['ITAdmin'] },
  { label: 'Timetable',      to: '/student/timetable',        icon: 'calendar3',              roles: ['ITAdmin'] },
  { label: 'Transcripts',    to: '/registrar/transcripts/issue', icon: 'file-earmark-text',   roles: ['ITAdmin'] },
  { label: 'Programs',       to: '/programs',                 icon: 'mortarboard',            roles: ['ITAdmin'] },
  { label: 'Courses',        to: '/courses',                  icon: 'book',                   roles: ['ITAdmin'] },
  { label: 'Syllabi',        to: '/syllabi',                  icon: 'file-earmark-ruled',     roles: ['ITAdmin'] },
  { label: 'Discussions',    to: '/discussions',              icon: 'chat-square-text',        roles: ['ITAdmin'] },
  { label: 'Assessments',    to: '/assessments',              icon: 'file-earmark-check',     roles: ['ITAdmin'] },
  { label: 'Submissions',    to: '/submissions',              icon: 'cloud-upload',           roles: ['ITAdmin'] },
  { label: 'Grade Changes',  to: '/grade-changes',            icon: 'arrow-left-right',       roles: ['ITAdmin'] },
  { label: 'Contents',       to: '/teaching/content',         icon: 'collection-play',        roles: ['ITAdmin'] },
  { label: 'Plagiarism',     to: '/admin/plagiarism/queue',   icon: 'shield-exclamation',     roles: ['ITAdmin'] },
  { label: 'Fees',           to: '/finance/fees',             icon: 'cash-stack',             roles: ['ITAdmin'] },
  { label: 'Invoices',       to: '/finance/invoices',         icon: 'receipt',                roles: ['ITAdmin'] },
  { label: 'Payments',       to: '/finance/payments',         icon: 'credit-card',            roles: ['ITAdmin'] },
  { label: 'Scholarships',   to: '/finance/scholarships',     icon: 'award',                  roles: ['ITAdmin'] },
  { label: 'Reports',        to: '/admin/reports',            icon: 'file-earmark-bar-graph', roles: ['ITAdmin'] },
  { label: 'KPIs',           to: '/admin/kpis',               icon: 'bar-chart-line',         roles: ['ITAdmin'] },
  { label: 'Audit Log',      to: '/admin/audit-log',          icon: 'journal-text',           roles: ['ITAdmin'] },
  { label: 'Audit Packages', to: '/admin/audit-packages',     icon: 'archive',                roles: ['ITAdmin'] },
  { label: 'Notifications',  to: '/notifications',            icon: 'bell',                   roles: ['ITAdmin'] },
  { label: 'Tickets',        to: '/tickets',                  icon: 'headset',                roles: ['ITAdmin'] },
];

export default function Sidebar() {
  const role    = useSelector(selectRole);
  const visible = NAV_ITEMS.filter(i =>
    i.roles.includes('*') || i.roles.includes(role)
  );

  return (
    <aside
      className="bg-white border-end"
      style={{ width: 240, minWidth: 240, flexShrink: 0, minHeight: 'calc(100vh - 56px)', overflowY: 'auto' }}
    >
      <ul className="nav flex-column p-3">
        {visible.map(item => (
          <li key={`${item.to}-${item.label}`} className="nav-item mb-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center ${
                  isActive ? 'active-nav' : 'text-dark'
                }`
              }
            >
              <i className={`bi bi-${item.icon} me-2`} aria-hidden="true"></i>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
