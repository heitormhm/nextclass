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
import AIChatPage from "./pages/AIChatPage";
import ReviewPage from "./pages/ReviewPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import LiveLecture from "./pages/LiveLecture";
import LectureTranscription from "./pages/LectureTranscription";
import TeacherCalendar from "./pages/TeacherCalendar";
import TeacherProfileSettings from "./pages/TeacherProfileSettings";
import TeacherConfigurations from "./pages/TeacherConfigurations";
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
          <Route path="/settings" element={<ProtectedRoute role="student"><SettingsPage /></ProtectedRoute>} />
          <Route path="/aichat" element={<ProtectedRoute role="student"><AIChatPage /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute role="student"><ReviewPage /></ProtectedRoute>} />
          
          {/* Teacher-only routes */}
          <Route path="/teacherdashboard" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/livelecture" element={<ProtectedRoute role="teacher"><LiveLecture /></ProtectedRoute>} />
          <Route path="/lecturetranscription" element={<ProtectedRoute role="teacher"><LectureTranscription /></ProtectedRoute>} />
          <Route path="/teachercalendar" element={<ProtectedRoute role="teacher"><TeacherCalendar /></ProtectedRoute>} />
          <Route path="/teacherprofilesettings" element={<ProtectedRoute role="teacher"><TeacherProfileSettings /></ProtectedRoute>} />
          <Route path="/teacherconfigurations" element={<ProtectedRoute role="teacher"><TeacherConfigurations /></ProtectedRoute>} />
          
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
