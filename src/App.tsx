import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import LecturePage from "./pages/LecturePage";
import LessonPlayerPage from "./pages/LessonPlayerPage";
import RecordScenario from "./pages/RecordScenario";
import CalendarPage from "./pages/CalendarPage";
import InternshipDashboard from "./pages/InternshipDashboard";
import InternshipSetup from "./pages/InternshipSetup";
import InternshipReviewPage from "./pages/InternshipReviewPage";
import AuthPage from "./pages/AuthPage";
import MyCoursesPage from "./pages/MyCoursesPage";
import QuizPage from "./pages/QuizPage";
import QuizPerformanceDashboard from "./pages/QuizPerformanceDashboard";
import AnnotationPage from "./pages/AnnotationPage";
import MyAnnotationsPage from "./pages/MyAnnotationsPage";
import ConsultationReviewPage from "./pages/ConsultationReviewPage";
import LibraryPage from "./pages/LibraryPage";
import GradesPage from "./pages/GradesPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import AIChatPage from "./pages/AIChatPage";
import ReviewPage from "./pages/ReviewPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherAIChatPage from "./pages/TeacherAIChatPage";
import LiveLecture from "./pages/LiveLecture";
import LectureTranscription from "./pages/LectureTranscription";
import TeacherCalendar from "./pages/TeacherCalendar";
import TeacherProfileSettings from "./pages/TeacherProfileSettings";
import TeacherConfigurations from "./pages/TeacherConfigurations";
import TeacherLessonPlans from "./pages/TeacherLessonPlans";
import TeacherLessonPlanEditor from "./pages/TeacherLessonPlanEditor";
import LectureTranscriptionPage from "./pages/LectureTranscriptionPage";
import TeacherAnnotationsPage from "./pages/TeacherAnnotationsPage";
import TeacherAnnotationPage from "./pages/TeacherAnnotationPage";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherValidation from "./pages/TeacherValidation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Student-only routes */}
          <Route path="/dashboard" element={<ProtectedRoute role="student"><Dashboard /></ProtectedRoute>} />
          <Route path="/lecture/:id" element={<ProtectedRoute role="student"><LecturePage /></ProtectedRoute>} />
          <Route path="/lesson/:id" element={<ProtectedRoute role="student"><LessonPlayerPage /></ProtectedRoute>} />
          <Route path="/internship" element={<ProtectedRoute role="student"><InternshipDashboard /></ProtectedRoute>} />
          <Route path="/internship/setup" element={<ProtectedRoute role="student"><InternshipSetup /></ProtectedRoute>} />
          <Route path="/internship/record" element={<ProtectedRoute role="student"><RecordScenario /></ProtectedRoute>} />
          <Route path="/internship/review/:id" element={<ProtectedRoute role="student"><InternshipReviewPage /></ProtectedRoute>} />
          <Route path="/record-scenario" element={<ProtectedRoute role="student"><RecordScenario /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute role="student"><CalendarPage /></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute role="student"><MyCoursesPage /></ProtectedRoute>} />
          <Route path="/quiz/:id" element={<ProtectedRoute role="student"><QuizPage /></ProtectedRoute>} />
          <Route path="/quiz-performance" element={<ProtectedRoute role="student"><QuizPerformanceDashboard /></ProtectedRoute>} />
          <Route path="/annotation/:id" element={<ProtectedRoute role="student"><AnnotationPage /></ProtectedRoute>} />
          <Route path="/annotations" element={<ProtectedRoute role="student"><MyAnnotationsPage /></ProtectedRoute>} />
          <Route path="/consultation-review/:id" element={<ProtectedRoute role="student"><ConsultationReviewPage /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute role="student"><LibraryPage /></ProtectedRoute>} />
          <Route path="/grades" element={<ProtectedRoute role="student"><GradesPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute role="student"><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute role="student"><SettingsPage /></ProtectedRoute>} />
          <Route path="/aichat" element={<ProtectedRoute role="student"><AIChatPage /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute role="student"><ReviewPage /></ProtectedRoute>} />
          
          {/* Admin-only routes */}
          <Route path="/admindashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          
          {/* Teacher-only routes */}
          <Route path="/teacherdashboard" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/ai-chat" element={<ProtectedRoute role="teacher"><TeacherAIChatPage /></ProtectedRoute>} />
          <Route path="/teacher/lesson-plans" element={<ProtectedRoute role="teacher"><TeacherLessonPlans /></ProtectedRoute>} />
          <Route path="/teacher/lesson-plans/:id" element={<ProtectedRoute role="teacher"><TeacherLessonPlanEditor /></ProtectedRoute>} />
          <Route path="/livelecture" element={<ProtectedRoute role="teacher"><LiveLecture /></ProtectedRoute>} />
          <Route path="/lecturetranscription" element={<ProtectedRoute role="teacher"><LectureTranscription /></ProtectedRoute>} />
          <Route path="/lecturetranscription/:id" element={<ProtectedRoute role="teacher"><LectureTranscriptionPage /></ProtectedRoute>} />
          <Route path="/teachercalendar" element={<ProtectedRoute role="teacher"><TeacherCalendar /></ProtectedRoute>} />
          <Route path="/teacherprofilesettings" element={<ProtectedRoute role="teacher"><TeacherProfileSettings /></ProtectedRoute>} />
          <Route path="/teacherconfigurations" element={<ProtectedRoute role="teacher"><TeacherConfigurations /></ProtectedRoute>} />
          <Route path="/teacher/annotations" element={<ProtectedRoute role="teacher"><TeacherAnnotationsPage /></ProtectedRoute>} />
          <Route path="/teacher/annotation/:id" element={<ProtectedRoute role="teacher"><TeacherAnnotationPage /></ProtectedRoute>} />
          
          {/* Teacher validation route (protected but accessible to unvalidated teachers) */}
          <Route path="/teacher/validate" element={<ProtectedRoute role="teacher"><TeacherValidation /></ProtectedRoute>} />
          
          {/* Public routes */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
