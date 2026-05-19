import { NavLink } from 'react-router-dom';
import { authService } from '../../services/authService';

const NAV_ITEMS = [
    { label: 'Dashboard',     to: '/dashboard',     icon: 'speedometer2',           roles: ['*'] },
    { label: 'Enrollment',    to: '/enrollment',    icon: 'card-checklist',         roles: ['Student'] },
    { label: 'Timetable',     to: '/timetable',     icon: 'calendar3',              roles: ['Student'] },
    { label: 'Courses',       to: '/courses',       icon: 'book',                   roles: ['Student'] },
    { label: 'Assessments',   to: '/assessments',   icon: 'file-earmark-check',     roles: ['Student'] },
    { label: 'Submissions',   to: '/submissions',   icon: 'cloud-upload',           roles: ['Student'] },
    { label: 'Contents',      to: '/contents',      icon: 'collection-play',        roles: ['Student'] },
    { label: 'Syllabi',       to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['Student'] },
    { label: 'Discussions',   to: '/discussions',   icon: 'chat-square-text',       roles: ['Student'] },
    { label: 'Transcripts',   to: '/transcripts',   icon: 'file-earmark-text',      roles: ['Student'] },
    { label: 'Invoices',      to: '/invoices',      icon: 'receipt',                roles: ['Student'] },
    { label: 'Programs',      to: '/programs',      icon: 'mortarboard',            roles: ['Student'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Student'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Student'] },
    { label: 'Courses',       to: '/courses',       icon: 'book',                   roles: ['Instructor'] },
    { label: 'Assessments',   to: '/assessments',   icon: 'file-earmark-check',     roles: ['Instructor'] },
    { label: 'Submissions',   to: '/submissions',   icon: 'cloud-upload',           roles: ['Instructor'] },
    { label: 'Grade Changes', to: '/grade-changes', icon: 'arrow-left-right',       roles: ['Instructor'] },
    { label: 'Contents',      to: '/contents',      icon: 'collection-play',        roles: ['Instructor'] },
    { label: 'Syllabi',       to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['Instructor'] },
    { label: 'Discussions',   to: '/discussions',   icon: 'chat-square-text',       roles: ['Instructor'] },
    { label: 'Plagiarism',    to: '/plagiarism',    icon: 'shield-exclamation',     roles: ['Instructor'] },
    { label: 'Students',      to: '/students',      icon: 'people',                 roles: ['Instructor'] },
    { label: 'Timetable',     to: '/timetable',     icon: 'calendar3',              roles: ['Instructor'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Instructor'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Instructor'] },
    { label: 'Applicants',    to: '/applicants',    icon: 'person-plus',            roles: ['Registrar'] },
    { label: 'Students',      to: '/students',      icon: 'people',                 roles: ['Registrar'] },
    { label: 'Sections',      to: '/sections',      icon: 'collection',             roles: ['Registrar'] },
    { label: 'Enrollment',    to: '/enrollment',    icon: 'card-checklist',         roles: ['Registrar'] },
    { label: 'Transcripts',   to: '/transcripts',   icon: 'file-earmark-text',      roles: ['Registrar'] },
    { label: 'Plagiarism',    to: '/plagiarism',    icon: 'shield-exclamation',     roles: ['Registrar'] },
    { label: 'Courses',       to: '/courses',       icon: 'book',                   roles: ['Registrar'] },
    { label: 'Syllabi',       to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['Registrar'] },
    { label: 'Discussions',   to: '/discussions',   icon: 'chat-square-text',       roles: ['Registrar'] },
    { label: 'Timetable',     to: '/timetable',     icon: 'calendar3',              roles: ['Registrar'] },
    { label: 'Programs',      to: '/programs',      icon: 'mortarboard',            roles: ['Registrar'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Registrar'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Registrar'] },
    { label: 'Programs',      to: '/programs',      icon: 'mortarboard',            roles: ['DeptAdmin'] },
    { label: 'Courses',       to: '/courses',       icon: 'book',                   roles: ['DeptAdmin'] },
    { label: 'Sections',      to: '/sections',      icon: 'collection',             roles: ['DeptAdmin'] },
    { label: 'Rooms',         to: '/rooms',         icon: 'door-closed',            roles: ['DeptAdmin'] },
    { label: 'Syllabi',       to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['DeptAdmin'] },
    { label: 'Discussions',   to: '/discussions',   icon: 'chat-square-text',       roles: ['DeptAdmin'] },
    { label: 'Timetable',     to: '/timetable',     icon: 'calendar3',              roles: ['DeptAdmin'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['DeptAdmin'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['DeptAdmin'] },
    { label: 'Fees',          to: '/fees',          icon: 'cash-stack',             roles: ['Finance'] },
    { label: 'Invoices',      to: '/invoices',      icon: 'receipt',                roles: ['Finance'] },
    { label: 'Scholarships',  to: '/scholarships',  icon: 'award',                  roles: ['Finance'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Finance'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Finance'] },
    { label: 'Reports',       to: '/reports',       icon: 'file-earmark-bar-graph', roles: ['Auditor'] },
    { label: 'KPIs',          to: '/kpis',          icon: 'bar-chart-line',         roles: ['Auditor'] },
    { label: 'Audit Log',     to: '/audit-log',     icon: 'journal-text',           roles: ['Auditor'] },
    { label: 'Grade Changes', to: '/grade-changes', icon: 'arrow-left-right',       roles: ['Auditor'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['Auditor'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['Auditor'] },
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
    { label: 'Syllabi',       to: '/syllabi',       icon: 'file-earmark-ruled',     roles: ['ITAdmin'] },
    { label: 'Discussions',   to: '/discussions',    icon: 'chat-square-text',       roles: ['ITAdmin'] },
    { label: 'Assessments',   to: '/assessments',   icon: 'file-earmark-check',     roles: ['ITAdmin'] },
    { label: 'Submissions',   to: '/submissions',   icon: 'cloud-upload',           roles: ['ITAdmin'] },
    { label: 'Grade Changes', to: '/grade-changes', icon: 'arrow-left-right',       roles: ['ITAdmin'] },
    { label: 'Contents',      to: '/contents',      icon: 'collection-play',        roles: ['ITAdmin'] },
    { label: 'Plagiarism',    to: '/plagiarism',    icon: 'shield-exclamation',     roles: ['ITAdmin'] },
    { label: 'Fees',          to: '/fees',          icon: 'cash-stack',             roles: ['ITAdmin'] },
    { label: 'Invoices',      to: '/invoices',      icon: 'receipt',                roles: ['ITAdmin'] },
    { label: 'Scholarships',  to: '/scholarships',  icon: 'award',                  roles: ['ITAdmin'] },
    { label: 'Reports',       to: '/reports',       icon: 'file-earmark-bar-graph', roles: ['ITAdmin'] },
    { label: 'KPIs',          to: '/kpis',          icon: 'bar-chart-line',         roles: ['ITAdmin'] },
    { label: 'Audit Log',     to: '/audit-log',     icon: 'journal-text',           roles: ['ITAdmin'] },
    { label: 'Notifications', to: '/notifications', icon: 'bell',                   roles: ['ITAdmin'] },
    { label: 'Tickets',       to: '/tickets',       icon: 'headset',                roles: ['ITAdmin'] },
];

export default function Sidebar({ collapsed, onToggle }) {
    const { role, username } = authService.getCurrentUser();
    const visible = NAV_ITEMS.filter(i => i.roles.includes('*') || i.roles.includes(role));
    const initials = (username || 'U').slice(0, 2).toUpperCase();

    return (
        <aside
            style={{
                width: collapsed ? 68 : 250,
                minWidth: collapsed ? 68 : 250,
                position: 'sticky',
                top: '56px',
                height: 'calc(100vh - 56px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                flexShrink: 0,
                transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'linear-gradient(180deg, #1a3c6e 0%, #2a5a9e 40%, #3b7dcc 100%)',
                whiteSpace: 'nowrap',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 0,
                position: 'sticky',
            }}
        >
            {/* Brand header */}
            <div style={{
                padding: collapsed ? '20px 0 12px' : '20px 20px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderBottom: '1px solid rgba(255,255,255,0.12)',
                marginBottom: 8,
            }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 14, fontWeight: 700, color: 'white',
                }}>{initials}</div>
                <div style={{
                    opacity: collapsed ? 0 : 1,
                    width: collapsed ? 0 : 'auto',
                    overflow: 'hidden',
                    transition: 'opacity 0.25s ease',
                }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'white', lineHeight: 1.2 }}>EduLearn</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{role}</div>
                </div>
            </div>

            {/* Nav items */}
            <ul style={{
                listStyle: 'none', margin: 0,
                padding: collapsed ? '4px 8px' : '4px 12px',
                flex: 1, overflowY: 'auto',
            }}>
                {visible.map((item, idx) => (
                    <li key={item.to} style={{ marginBottom: 2 }}>
                        <NavLink
                            to={item.to}
                            title={collapsed ? item.label : ''}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: collapsed ? '11px 0' : '10px 14px',
                                borderRadius: 12,
                                textDecoration: 'none',
                                color: 'white',
                                fontSize: 13,
                                fontWeight: isActive ? 600 : 400,
                                background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                transition: 'background 0.2s ease, transform 0.15s ease',
                                position: 'relative',
                                overflow: 'hidden',
                            })}
                            onMouseEnter={e => {
                                if (!e.currentTarget.classList.contains('active')) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.transform = 'translateX(2px)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!e.currentTarget.classList.contains('active')) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }
                            }}
                        >
                            <i className={`bi bi-${item.icon}`} style={{
                                fontSize: collapsed ? 20 : 16,
                                opacity: 0.9,
                                flexShrink: 0,
                                width: collapsed ? 'auto' : 20,
                                textAlign: 'center',
                                transition: 'font-size 0.25s ease',
                            }}></i>
                            <span style={{
                                opacity: collapsed ? 0 : 1,
                                width: collapsed ? 0 : 'auto',
                                overflow: 'hidden',
                                transition: 'opacity 0.2s ease',
                            }}>{item.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>

            {/* Bottom settings link */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.12)',
                padding: collapsed ? '12px 8px' : '12px',
            }}>
                <NavLink
                    to="/profile"
                    title={collapsed ? 'Settings' : ''}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: collapsed ? '10px 0' : '10px 14px',
                        borderRadius: 12, textDecoration: 'none', color: 'rgba(255,255,255,0.7)',
                        fontSize: 13, justifyContent: collapsed ? 'center' : 'flex-start',
                        transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'white'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                >
                    <i className="bi bi-gear" style={{ fontSize: collapsed ? 20 : 16, flexShrink: 0 }}></i>
                    <span style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto', overflow: 'hidden', transition: 'opacity 0.2s ease' }}>Settings</span>
                </NavLink>
            </div>
        </aside>
    );
}
