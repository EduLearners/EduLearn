import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import RequireAuth    from './components/auth/RequireAuth';
import RequireRole    from './components/auth/RequireRole';
import AppLayout      from './components/Layout/AppLayout';

// ── Public pages ───────────────────────────────────────────
import LandingPage        from './pages/LandingPage';
import LoginPage          from './pages/LoginPage';
import MfaSetupPage       from './pages/MfaSetupPage';
import MfaVerifyPage      from './pages/MfaVerifyPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';

// ── Shared protected pages ──────────────────────────────────
import DashboardPage  from './pages/dashboard/DashboardPage';
import ProfilePage    from './pages/ProfilePage';

// ── IAM — Ashish ────────────────────────────────────────────
import UsersPage      from './pages/users/UsersPage';
import UserDetailPage from './pages/users/UserDetailPage';

// ── SRA module — Saurav ────────────────────────────────────
import ApplicantsPage      from './pages/applicants/ApplicantsPage';
import NewApplicantPage    from './pages/applicants/NewApplicantPage';
import ApplicantDetailPage from './pages/applicants/ApplicantDetailPage';
import StudentsPage        from './pages/students/StudentsPage';
import NewStudentPage      from './pages/students/NewStudentPage';
import StudentDetailPage   from './pages/students/StudentDetailPage';
import TranscriptsPage      from './pages/transcripts/TranscriptsPage';
import TranscriptIssuePage  from './pages/students/TranscriptIssuePage';
import EnrollmentPage      from './pages/enrollment/EnrollmentPage';
import TimetablePage       from './pages/timetable/TimetablePage';

// ── ETS module — Saurav ────────────────────────────────────
import SectionsPage      from './pages/sections/SectionsPage';
import SectionDetailPage from './pages/sections/SectionDetailPage';
import RoomsPage         from './pages/rooms/RoomsPage';
import RoomDetailPage    from './pages/rooms/RoomDetailPage';

// ── CCM + LMS + AGI — Vikash ───────────────────────────────
import CoursesPage          from './pages/courses/CoursesPage';
import CourseDetailPage     from './pages/courses/CourseDetailPage';
import CourseFormPage       from './pages/courses/CourseFormPage';
import CourseViewPage       from './pages/courses/CourseViewPage';
import GradebookPage        from './pages/sections/GradebookPage';
import AssessmentEditorPage from './pages/sections/AssessmentEditorPage';
import AssessmentsPage      from './pages/assessments/AssessmentsPage';
import AssessmentDetailPage from './pages/assessments/AssessmentDetailPage';
import AssessmentFormPage   from './pages/assessments/AssessmentFormPage';
import SubmissionsPage      from './pages/submissions/SubmissionsPage';
import SubmitPage           from './pages/submissions/SubmitPage';
import GradePage            from './pages/submissions/GradePage';
import ContentsPage         from './pages/contents/ContentsPage';
import ContentDetailPage    from './pages/contents/ContentDetailPage';
import ContentFormPage      from './pages/contents/ContentFormPage';
import PlagiarismPage       from './pages/plagiarism/PlagiarismPage';
import PlagiarismDetailPage from './pages/plagiarism/PlagiarismDetailPage';
import GradeChangesPage     from './pages/gradechanges/GradeChangesPage';
import SyllabiPage          from './pages/syllabi/SyllabiPage';
import DiscussionsPage      from './pages/discussions/DiscussionsPage';

// ── RKA + Programs — Utkarsh ───────────────────────────────
import ProgramsPage      from './pages/programs/ProgramsPage';
import ProgramDetailPage from './pages/programs/ProgramDetailPage';
import ProgramFormPage   from './pages/programs/ProgramFormPage';
import ReportsPage       from './pages/reports/ReportsPage';
import KpisPage          from './pages/reports/KpisPage';
import AuditLogPage      from './pages/reports/AuditLogPage';
import AuditPackagesPage from './pages/reports/AuditPackagesPage';

// ── SFB — Tanya ────────────────────────────────────────────
import FeesPage           from './pages/finance/FeesPage';
import InvoicesPage       from './pages/finance/InvoicesPage';
import InvoiceDetailPage  from './pages/finance/InvoiceDetailPage';
import PaymentsLedgerPage from './pages/finance/PaymentsLedgerPage';
import ScholarshipsPage   from './pages/finance/ScholarshipsPage';

// ── NHT — Swarna ───────────────────────────────────────────
import NotificationsPage from './pages/notifications/NotificationsPage';
import TicketsPage       from './pages/notifications/TicketsPage';
import TicketDetailPage  from './pages/notifications/TicketDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes ─────────────────────────────── */}
        <Route path="/"                element={<LandingPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/mfa-setup"       element={<MfaSetupPage />} />
        <Route path="/mfa-verify"      element={<MfaVerifyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        {/* Legacy MFA paths — alias */}
        <Route path="/mfa/setup"  element={<MfaSetupPage />} />
        <Route path="/mfa/verify" element={<MfaVerifyPage />} />

        {/* ── Protected routes ──────────────────────────── */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>

          {/* General */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile"   element={<ProfilePage />} />

          {/* ── IAM (Ashish) ──────────────────────────── */}
          <Route path="/admin/users"     element={<RequireRole allowedRoles={['ITAdmin']}><UsersPage /></RequireRole>} />
          <Route path="/admin/users/:id" element={<RequireRole allowedRoles={['ITAdmin']}><UserDetailPage /></RequireRole>} />
          <Route path="/users"           element={<Navigate to="/admin/users" replace />} />
          <Route path="/users/:id"       element={<Navigate to="/admin/users" replace />} />

          {/* ── SRA (Saurav) ──────────────────────────── */}
          <Route path="/registrar/applicants"        element={<RequireRole allowedRoles={['Registrar','ITAdmin']}><ApplicantsPage /></RequireRole>} />
          <Route path="/registrar/applicants/new"    element={<RequireRole allowedRoles={['Registrar','ITAdmin']}><NewApplicantPage /></RequireRole>} />
          <Route path="/registrar/applicants/:id"    element={<RequireRole allowedRoles={['Registrar','ITAdmin']}><ApplicantDetailPage /></RequireRole>} />
          <Route path="/registrar/students"          element={<RequireRole allowedRoles={['Registrar','Instructor','ITAdmin']}><StudentsPage /></RequireRole>} />
          <Route path="/registrar/students/new"      element={<RequireRole allowedRoles={['Registrar','ITAdmin']}><NewStudentPage /></RequireRole>} />
          <Route path="/registrar/students/:id"      element={<RequireRole allowedRoles={['Registrar','Instructor','ITAdmin']}><StudentDetailPage /></RequireRole>} />
          <Route path="/registrar/enrollment"        element={<EnrollmentPage />} />
          <Route path="/registrar/transcripts/issue" element={<RequireRole allowedRoles={['Registrar','ITAdmin']}><TranscriptIssuePage /></RequireRole>} />
          <Route path="/student/transcript"          element={<RequireRole allowedRoles={['Student','Registrar','ITAdmin']}><TranscriptsPage /></RequireRole>} />
          <Route path="/student/timetable"           element={<TimetablePage />} />
          <Route path="/teaching/sections/:id/roster" element={<RequireRole allowedRoles={['Instructor','Registrar','ITAdmin']}><SectionDetailPage /></RequireRole>} />

          {/* Legacy redirects */}
          <Route path="/applicants"     element={<Navigate to="/registrar/applicants" replace />} />
          <Route path="/applicants/new" element={<Navigate to="/registrar/applicants/new" replace />} />
          <Route path="/applicants/:id" element={<Navigate to="/registrar/applicants" replace />} />
          <Route path="/students"       element={<Navigate to="/registrar/students" replace />} />
          <Route path="/students/:id"   element={<Navigate to="/registrar/students" replace />} />
          <Route path="/enrollment"     element={<Navigate to="/registrar/enrollment" replace />} />
          <Route path="/transcripts"    element={<Navigate to="/student/transcript" replace />} />
          <Route path="/timetable"      element={<Navigate to="/student/timetable" replace />} />

          {/* Sections & Rooms */}
          <Route path="/sections"    element={<SectionsPage />} />
          <Route path="/sections/:id" element={<SectionDetailPage />} />
          <Route path="/rooms"       element={<RoomsPage />} />
          <Route path="/rooms/:id"   element={<RoomDetailPage />} />

          {/* ── CCM + LMS + AGI (Vikash) ──────────────── */}
          <Route path="/courses"          element={<CoursesPage />} />
          <Route path="/courses/new"      element={<RequireRole allowedRoles={['Instructor','DeptAdmin','ITAdmin']}><CourseFormPage /></RequireRole>} />
          <Route path="/courses/:id"      element={<CourseDetailPage />} />
          <Route path="/courses/:id/edit" element={<RequireRole allowedRoles={['Instructor','DeptAdmin','ITAdmin']}><CourseFormPage /></RequireRole>} />
          <Route path="/student/courses/:id" element={<RequireRole allowedRoles={['Student']}><CourseViewPage /></RequireRole>} />

          <Route path="/teaching/sections/:id/gradebook"   element={<RequireRole allowedRoles={['Instructor','ITAdmin']}><GradebookPage /></RequireRole>} />
          <Route path="/teaching/sections/:id/assessments" element={<RequireRole allowedRoles={['Instructor','ITAdmin']}><AssessmentEditorPage /></RequireRole>} />
          <Route path="/teaching/content"     element={<RequireRole allowedRoles={['Instructor','ITAdmin']}><ContentsPage /></RequireRole>} />
          <Route path="/teaching/content/new" element={<RequireRole allowedRoles={['Instructor','ITAdmin']}><ContentFormPage /></RequireRole>} />

          <Route path="/contents"          element={<ContentsPage />} />
          <Route path="/contents/new"      element={<ContentFormPage />} />
          <Route path="/contents/:id"      element={<ContentDetailPage />} />
          <Route path="/contents/:id/edit" element={<ContentFormPage />} />

          <Route path="/assessments"          element={<AssessmentsPage />} />
          <Route path="/assessments/new"      element={<AssessmentFormPage />} />
          <Route path="/assessments/:id"      element={<AssessmentDetailPage />} />
          <Route path="/assessments/:id/edit" element={<AssessmentFormPage />} />
          <Route path="/student/assessments/:id" element={<RequireRole allowedRoles={['Student']}><SubmitPage /></RequireRole>} />

          <Route path="/submissions"            element={<SubmissionsPage />} />
          <Route path="/submissions/:id/submit" element={<SubmitPage />} />
          <Route path="/submissions/:id/grade"  element={<RequireRole allowedRoles={['Instructor','ITAdmin']}><GradePage /></RequireRole>} />

          <Route path="/admin/plagiarism/queue" element={<RequireRole allowedRoles={['Instructor','ITAdmin','Registrar']}><PlagiarismPage /></RequireRole>} />
          <Route path="/admin/plagiarism/:id"   element={<RequireRole allowedRoles={['Instructor','ITAdmin','Registrar']}><PlagiarismDetailPage /></RequireRole>} />
          <Route path="/plagiarism"             element={<Navigate to="/admin/plagiarism/queue" replace />} />

          <Route path="/grade-changes" element={<GradeChangesPage />} />
          <Route path="/syllabi"       element={<SyllabiPage />} />
          <Route path="/discussions"   element={<DiscussionsPage />} />

          {/* ── RKA + Programs (Utkarsh) ──────────────── */}
          <Route path="/programs"          element={<ProgramsPage />} />
          <Route path="/programs/new"      element={<RequireRole allowedRoles={['DeptAdmin','ITAdmin']}><ProgramFormPage /></RequireRole>} />
          <Route path="/programs/:id"      element={<ProgramDetailPage />} />
          <Route path="/programs/:id/edit" element={<RequireRole allowedRoles={['DeptAdmin','ITAdmin']}><ProgramFormPage /></RequireRole>} />

          <Route path="/admin/reports"         element={<RequireRole allowedRoles={['Auditor','ITAdmin']}><ReportsPage /></RequireRole>} />
          <Route path="/admin/kpis"            element={<RequireRole allowedRoles={['Auditor','ITAdmin']}><KpisPage /></RequireRole>} />
          <Route path="/admin/audit-log"       element={<RequireRole allowedRoles={['Auditor','ITAdmin']}><AuditLogPage /></RequireRole>} />
          <Route path="/admin/audit-packages"  element={<RequireRole allowedRoles={['Auditor','ITAdmin']}><AuditPackagesPage /></RequireRole>} />

          <Route path="/reports"   element={<Navigate to="/admin/reports"   replace />} />
          <Route path="/kpis"      element={<Navigate to="/admin/kpis"      replace />} />
          <Route path="/audit-log" element={<Navigate to="/admin/audit-log" replace />} />

          {/* ── SFB (Tanya) ───────────────────────────── */}
          <Route path="/finance/invoices"     element={<RequireRole allowedRoles={['Finance','ITAdmin','Student']}><InvoicesPage /></RequireRole>} />
          <Route path="/finance/payments"     element={<RequireRole allowedRoles={['Finance','ITAdmin']}><PaymentsLedgerPage /></RequireRole>} />
          <Route path="/finance/fees"         element={<RequireRole allowedRoles={['Finance','ITAdmin']}><FeesPage /></RequireRole>} />
          <Route path="/finance/scholarships" element={<RequireRole allowedRoles={['Finance','ITAdmin']}><ScholarshipsPage /></RequireRole>} />
          <Route path="/student/invoices/:id" element={<RequireRole allowedRoles={['Student']}><InvoiceDetailPage /></RequireRole>} />

          <Route path="/invoices"     element={<Navigate to="/finance/invoices"     replace />} />
          <Route path="/fees"         element={<Navigate to="/finance/fees"         replace />} />
          <Route path="/scholarships" element={<Navigate to="/finance/scholarships" replace />} />

          {/* ── NHT (Swarna) ──────────────────────────── */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/tickets"       element={<TicketsPage />} />
          <Route path="/tickets/:id"   element={<TicketDetailPage />} />

        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
