import { NavLink } from 'react-router-dom';
import { authService } from '../../services/authService';

const NAV_ITEMS = [
    { label: 'Dashboard', to: '/dashboard', icon: 'speedometer2', roles: ['*'] },
    { label: 'Applicants', to: '/applicants', icon: 'person-plus', roles: ['Registrar', 'ITAdmin'] },
    { label: 'Students', to: '/students', icon: 'people', roles: ['Registrar', 'Instructor', 'ITAdmin'] },
    { label: 'Sections', to: '/sections', icon: 'collection', roles: ['Registrar', 'DeptAdmin', 'ITAdmin'] },
    { label: 'Rooms', to: '/rooms', icon: 'door-closed', roles: ['DeptAdmin', 'ITAdmin'] },
    { label: 'Enrollment', to: '/enrollment', icon: 'card-checklist', roles: ['Student', 'Registrar', 'ITAdmin'] },
    { label: 'Timetable', to: '/timetable', icon: 'calendar3', roles: ['*'] },
    { label: 'Transcripts', to: '/transcripts', icon: 'file-earmark-text', roles: ['Student', 'Registrar', 'ITAdmin'] },
    { label: 'Plagiarism', to: '/plagiarism', icon: 'shield-exclamation', roles: ['Instructor', 'Registrar', 'ITAdmin'] },
];

export default function Sidebar() {
    const { role } = authService.getCurrentUser();
    const visible = NAV_ITEMS.filter(i => i.roles.includes('*') || i.roles.includes(role));

    return (
        <aside className="bg-white border-end" style={{ width: 240, minHeight: 'calc(100vh - 56px)' }}>
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
        </aside>
    );
}