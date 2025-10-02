import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import TeacherDashboard from "./pages/TeacherDashboard";
import LiveLecture from "./pages/LiveLecture";
import LectureTranscription from "./pages/LectureTranscription";
import TeacherCalendar from "./pages/TeacherCalendar";
import TeacherProfileSettings from "./pages/TeacherProfileSettings";
import TeacherConfigurations from "./pages/TeacherConfigurations";
import MeusCursosPage from "./pages/MeusCursosPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lecture/:id" element={<LecturePage />} />
          <Route path="/lesson/:id" element={<LessonPlayerPage />} />
          <Route path="/internship" element={<InternshipDashboard />} />
          <Route path="/record-scenario" element={<RecordScenario />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/courses" element={<MyCoursesPage />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/quiz-performance" element={<QuizPerformanceDashboard />} />
          <Route path="/annotation/:id" element={<AnnotationPage />} />
          <Route path="/annotations" element={<MyAnnotationsPage />} />
          <Route path="/consultation-review/:id" element={<ConsultationReviewPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/grades" element={<GradesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/aichat" element={<AIChatPage />} />
          <Route path="/teacherdashboard" element={<TeacherDashboard />} />
          <Route path="/livelecture" element={<LiveLecture />} />
          <Route path="/lecturetranscription" element={<LectureTranscription />} />
          <Route path="/teachercalendar" element={<TeacherCalendar />} />
          <Route path="/teacherprofilesettings" element={<TeacherProfileSettings />} />
          <Route path="/teacherconfigurations" element={<TeacherConfigurations />} />
          <Route path="/meus-cursos" element={<MeusCursosPage />} />
          <Route path="/auth" element={<AuthPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
