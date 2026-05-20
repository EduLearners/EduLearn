import { useSelector } from 'react-redux';
import { selectRole }  from '../../store/authSlice';

import StudentDashboard    from '../../components/Dashboard/StudentDashboard';
import InstructorDashboard from '../../components/Dashboard/InstructorDashboard';
import RegistrarDashboard  from '../../components/Dashboard/RegistrarDashboard';
import DeptAdminDashboard  from '../../components/Dashboard/DeptAdminDashboard';
import FinanceDashboard    from '../../components/Dashboard/FinanceDashboard';
import ITAdminDashboard    from '../../components/Dashboard/ITAdminDashboard';
import AuditorDashboard    from '../../components/Dashboard/AuditorDashboard';

export default function DashboardPage() {
    // Use Redux selector — reactive to login/logout, no stale reads
    const role = useSelector(selectRole);

    const dashboards = {
        Student:    <StudentDashboard />,
        Instructor: <InstructorDashboard />,
        Registrar:  <RegistrarDashboard />,
        DeptAdmin:  <DeptAdminDashboard />,
        Finance:    <FinanceDashboard />,
        ITAdmin:    <ITAdminDashboard />,
        Auditor:    <AuditorDashboard />,
    };

    return dashboards[role] || (
        <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Unknown role: <strong>{role}</strong>. Please contact IT Admin.
        </div>
    );
}
