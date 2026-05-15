import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import MfaSetupPage from './pages/MfaSetupPage';
import MfaVerifyPage from './pages/MfaVerifyPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ComingSoonPage from './pages/ComingSoonPage';

// SRA module
import StudentsPage from './pages/students/StudentsPage';
import NewStudentPage from './pages/students/NewStudentPage';
import StudentDetailPage from './pages/students/StudentDetailPage';
import ApplicantsPage from './pages/applicants/ApplicantsPage';
import NewApplicantPage from './pages/applicants/NewApplicantPage';
import ApplicantDetailPage from './pages/applicants/ApplicantDetailPage';

// ETS module
import RoomsPage from './pages/rooms/RoomsPage';
import RoomDetailPage from './pages/rooms/RoomDetailPage';
import SectionsPage from './pages/sections/SectionsPage';
import SectionDetailPage from './pages/sections/SectionDetailPage';
import EnrollmentPage from './pages/enrollment/EnrollmentPage';
import TimetablePage from './pages/timetable/TimetablePage';
import TranscriptsPage from './pages/transcripts/TranscriptsPage';

// AGI-04
import PlagiarismPage from './pages/plagiarism/PlagiarismPage';

// RKA — Programs (Utkarsh)
import ProgramsPage from './pages/programs/ProgramsPage';
import ProgramDetailPage from './pages/programs/ProgramDetailPage';
import ProgramFormPage from './pages/programs/ProgramFormPage';

// CCM module (Vikash)
import CoursesPage from './pages/courses/CoursesPage';
import CourseDetailPage from './pages/courses/CourseDetailPage';
import CourseFormPage from './pages/courses/CourseFormPage';

// AGI module (Vikash)
import AssessmentsPage from './pages/assessments/AssessmentsPage';
import AssessmentDetailPage from './pages/assessments/AssessmentDetailPage';
import AssessmentFormPage from './pages/assessments/AssessmentFormPage';

// Submissions (Vikash)
import SubmissionsPage from './pages/submissions/SubmissionsPage';
import SubmitPage from './pages/submissions/SubmitPage';
import GradePage from './pages/submissions/GradePage';

// LMS module (Vikash)
import ContentsPage from './pages/contents/ContentsPage';
import ContentDetailPage from './pages/contents/ContentDetailPage';
import ContentFormPage from './pages/contents/ContentFormPage';

import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

// RKA — Reports, KPIs, Audit Log
import ReportsPage from './pages/reports/ReportsPage';
import KpisPage from './pages/reports/KpisPage';
import AuditLogPage from './pages/reports/AuditLogPage';

// Grade Changes, Syllabi, Discussions (Vikash)
import GradeChangesPage from './pages/gradechanges/GradeChangesPage';
import SyllabiPage from './pages/syllabi/SyllabiPage';
import DiscussionsPage from './pages/discussions/DiscussionsPage';

// SFB module — Tanya
import FeesPage from './pages/finance/FeesPage';
import InvoicesPage from './pages/finance/InvoicesPage';
import ScholarshipsPage from './pages/finance/ScholarshipsPage';

// NHT module — Swarna
import NotificationsPage from './pages/notifications/NotificationsPage';
import TicketsPage from './pages/notifications/TicketsPage';

// IAM — User Management (ITAdmin)
import UsersPage from './pages/users/UsersPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/mfa/setup" element={<MfaSetupPage />} />
                <Route path="/mfa/verify" element={<MfaVerifyPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected routes */}
                <Route element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* SRA module */}
                    <Route path="/applicants" element={<ApplicantsPage />} />
                    <Route path="/applicants/new" element={<NewApplicantPage />} />
                    <Route path="/applicants/:id" element={<ApplicantDetailPage />} />
                    <Route path="/students" element={<StudentsPage />} />
                    <Route path="/students/new" element={<NewStudentPage />} />
                    <Route path="/students/:id" element={<StudentDetailPage />} />
                    <Route path="/transcripts" element={<TranscriptsPage />} />

                    {/* ETS module */}
                    <Route path="/sections" element={<SectionsPage />} />
                    <Route path="/sections/:id" element={<SectionDetailPage />} />
                    <Route path="/rooms" element={<RoomsPage />} />
                    <Route path="/rooms/:id" element={<RoomDetailPage />} />
                    <Route path="/enrollment" element={<EnrollmentPage />} />
                    <Route path="/timetable" element={<TimetablePage />} />

                    {/* AGI-04 */}
                    <Route path="/plagiarism" element={<PlagiarismPage />} />

                    {/* RKA — Programs */}
                    <Route path="/programs" element={<ProgramsPage />} />
                    <Route path="/programs/new" element={<ProgramFormPage />} />
                    <Route path="/programs/:id" element={<ProgramDetailPage />} />
                    <Route path="/programs/:id/edit" element={<ProgramFormPage />} />

                    {/* CCM module */}
                    <Route path="/courses" element={<CoursesPage />} />
                    <Route path="/courses/new" element={<CourseFormPage />} />
                    <Route path="/courses/:id" element={<CourseDetailPage />} />
                    <Route path="/courses/:id/edit" element={<CourseFormPage />} />

                    {/* AGI module */}
                    <Route path="/assessments" element={<AssessmentsPage />} />
                    <Route path="/assessments/new" element={<AssessmentFormPage />} />
                    <Route path="/assessments/:id" element={<AssessmentDetailPage />} />
                    <Route path="/assessments/:id/edit" element={<AssessmentFormPage />} />

                    {/* Submissions */}
                    <Route path="/submissions" element={<SubmissionsPage />} />
                    <Route path="/submissions/:id/submit" element={<SubmitPage />} />
                    <Route path="/submissions/:id/grade" element={<GradePage />} />

                    {/* LMS module */}
                    <Route path="/contents" element={<ContentsPage />} />
                    <Route path="/contents/new" element={<ContentFormPage />} />
                    <Route path="/contents/:id" element={<ContentDetailPage />} />
                    <Route path="/contents/:id/edit" element={<ContentFormPage />} />

                    {/* RKA — Reports */}
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/kpis" element={<KpisPage />} />
                    <Route path="/audit-log" element={<AuditLogPage />} />

                    {/* Grade Changes */}
                    <Route path="/grade-changes" element={<GradeChangesPage />} />

                    {/* Syllabi */}
                    <Route path="/syllabi" element={<SyllabiPage />} />

                    {/* Discussions */}
                    <Route path="/discussions" element={<DiscussionsPage />} />
                    {/* SFB module — Tanya */}
                    <Route path="/fees" element={<FeesPage />} />
                    <Route path="/invoices" element={<InvoicesPage />} />
                    <Route path="/scholarships" element={<ScholarshipsPage />} />
                    {/* NHT module — Swarna */}
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/tickets" element={<TicketsPage />} />

                    {/* IAM — User Management (ITAdmin) */}
                    <Route path="/users" element={<UsersPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}