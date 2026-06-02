import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import Loading from './components/Loading';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const MfaSetupPage = lazy(() => import('./pages/MfaSetupPage'));
const MfaVerifyPage = lazy(() => import('./pages/MfaVerifyPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'));

// SRA module
const StudentsPage = lazy(() => import('./pages/students/StudentsPage'));
const NewStudentPage = lazy(() => import('./pages/students/NewStudentPage'));
const StudentDetailPage = lazy(() => import('./pages/students/StudentDetailPage'));
const ApplicantsPage = lazy(() => import('./pages/applicants/ApplicantsPage'));
const NewApplicantPage = lazy(() => import('./pages/applicants/NewApplicantPage'));
const ApplicantDetailPage = lazy(() => import('./pages/applicants/ApplicantDetailPage'));

// ETS module
const RoomsPage = lazy(() => import('./pages/rooms/RoomsPage'));
const RoomDetailPage = lazy(() => import('./pages/rooms/RoomDetailPage'));
const SectionsPage = lazy(() => import('./pages/sections/SectionsPage'));
const SectionDetailPage = lazy(() => import('./pages/sections/SectionDetailPage'));
const EnrollmentPage = lazy(() => import('./pages/enrollment/EnrollmentPage'));
const TimetablePage = lazy(() => import('./pages/timetable/TimetablePage'));
const TranscriptsPage = lazy(() => import('./pages/transcripts/TranscriptsPage'));

// RKA — Programs (Utkarsh)
const ProgramsPage = lazy(() => import('./pages/programs/ProgramsPage'));
const ProgramDetailPage = lazy(() => import('./pages/programs/ProgramDetailPage'));
const ProgramFormPage = lazy(() => import('./pages/programs/ProgramFormPage'));

// CCM module (Vikash)
const CoursesPage = lazy(() => import('./pages/courses/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/courses/CourseDetailPage'));
const CourseFormPage = lazy(() => import('./pages/courses/CourseFormPage'));

// AGI module (Vikash)
const AssessmentsPage = lazy(() => import('./pages/assessments/AssessmentsPage'));
const AssessmentDetailPage = lazy(() => import('./pages/assessments/AssessmentDetailPage'));
const AssessmentFormPage = lazy(() => import('./pages/assessments/AssessmentFormPage'));

// Submissions (Vikash)
const SubmissionsPage = lazy(() => import('./pages/submissions/SubmissionsPage'));
const SubmitPage = lazy(() => import('./pages/submissions/SubmitPage'));
const GradePage = lazy(() => import('./pages/submissions/GradePage'));

// LMS module (Vikash)
const ContentsPage = lazy(() => import('./pages/contents/ContentsPage'));
const ContentDetailPage = lazy(() => import('./pages/contents/ContentDetailPage'));
const ContentFormPage = lazy(() => import('./pages/contents/ContentFormPage'));

// RKA — Reports, KPIs, Audit Log, Audit Packages
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const KpisPage = lazy(() => import('./pages/reports/KpisPage'));
const AuditLogPage = lazy(() => import('./pages/reports/AuditLogPage'));
const AuditPackagesPage = lazy(() => import('./pages/reports/AuditPackagesPage'));

// Grade Changes, Syllabi, Discussions (Vikash)
const GradeChangesPage = lazy(() => import('./pages/gradechanges/GradeChangesPage'));
const SyllabiPage = lazy(() => import('./pages/syllabi/SyllabiPage'));
const DiscussionsPage = lazy(() => import('./pages/discussions/DiscussionsPage'));

// SFB module — Tanya
const FeesPage = lazy(() => import('./pages/finance/FeesPage'));
const InvoicesPage = lazy(() => import('./pages/finance/InvoicesPage'));
const ScholarshipsPage = lazy(() => import('./pages/finance/ScholarshipsPage'));
const PaymentsPage = lazy(() => import('./pages/finance/PaymentsPage'));

// NHT module — Swarna
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const TicketsPage = lazy(() => import('./pages/notifications/TicketsPage'));

// IAM — User Management (ITAdmin)
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/users/UserDetailPage'));

export default function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<Loading message="Loading..." />}>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
                    <Route path="/mfa/setup" element={<PublicOnlyRoute><MfaSetupPage /></PublicOnlyRoute>} />
                    <Route path="/mfa/verify" element={<PublicOnlyRoute><MfaVerifyPage /></PublicOnlyRoute>} />
                    <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
                    <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />

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
                        <Route path="/reports" element={<ProtectedRoute allowedRoles={['Auditor', 'ITAdmin']}><ReportsPage /></ProtectedRoute>} />
                        <Route path="/kpis" element={<ProtectedRoute allowedRoles={['Auditor', 'ITAdmin']}><KpisPage /></ProtectedRoute>} />
                        <Route path="/audit-log" element={<ProtectedRoute allowedRoles={['Auditor', 'ITAdmin']}><AuditLogPage /></ProtectedRoute>} />
                        <Route path="/audit-packages" element={<ProtectedRoute allowedRoles={['Auditor', 'ITAdmin']}><AuditPackagesPage /></ProtectedRoute>} />

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
                        <Route path="/payments" element={<PaymentsPage />} />
                        {/* NHT module — Swarna */}
                        <Route path="/notifications" element={<NotificationsPage />} />
                        <Route path="/tickets" element={<TicketsPage />} />

                        {/* IAM — User Management (ITAdmin) */}
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/users/:id" element={<UserDetailPage />} />

                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
