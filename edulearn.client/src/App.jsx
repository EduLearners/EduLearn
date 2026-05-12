import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import MfaSetupPage from './pages/MfaSetupPage';
import MfaVerifyPage from './pages/MfaVerifyPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ComingSoonPage from './pages/ComingSoonPage';

// Students pages (built)
import StudentsPage from './pages/students/StudentsPage';
import NewStudentPage from './pages/students/NewStudentPage';
import StudentDetailPage from './pages/students/StudentDetailPage';

// Applicants pages (built)
import ApplicantsPage from './pages/applicants/ApplicantsPage';
import NewApplicantPage from './pages/applicants/NewApplicantPage';
import ApplicantDetailPage from './pages/applicants/ApplicantDetailPage';

// Rooms page (built)
import RoomsPage from './pages/rooms/RoomsPage';

// Sections page (built)
import SectionsPage from './pages/sections/SectionsPage';

// Enrollment page (built)
import EnrollmentPage from './pages/enrollment/EnrollmentPage';

// Timetable page (built)
import TimetablePage from './pages/timetable/TimetablePage';

// Transcripts page (built)
import TranscriptsPage from './pages/transcripts/TranscriptsPage';

// Plagiarism page (built — AGI-04 backend was Saurav's, frontend completes the loop)
import PlagiarismPage from './pages/plagiarism/PlagiarismPage';

import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/mfa/setup" element={<MfaSetupPage />} />
                <Route path="/mfa/verify" element={<MfaVerifyPage />} />

                {/* Protected routes — all use AppLayout (Navbar + Sidebar) */}
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

                    {/* ETS module — to be built */}
                    <Route path="/sections" element={<SectionsPage />} />
                    <Route path="/rooms" element={<RoomsPage />} />
                    <Route path="/enrollment" element={<EnrollmentPage />} />
                    <Route path="/timetable" element={<TimetablePage />} />

                    {/* AGI-04 */}
                    <Route path="/plagiarism" element={<PlagiarismPage />} />
                </Route>

                {/* Catch-all — send unknown routes to the landing page */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
