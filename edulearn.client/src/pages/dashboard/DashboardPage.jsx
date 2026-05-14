import { authService } from '../../services/authService';
import StudentDashboard    from './StudentDashboard';
import InstructorDashboard from './InstructorDashboard';
import RegistrarDashboard  from './RegistrarDashboard';
import DeptAdminDashboard  from './DeptAdminDashboard';
import FinanceDashboard    from './FinanceDashboard';
import ITAdminDashboard    from './ITAdminDashboard';
import AuditorDashboard    from './AuditorDashboard';

export default function DashboardPage() {
    const { role } = authService.getCurrentUser();

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
