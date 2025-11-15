import { useState } from "react";
import { Menu, X, ChevronDown, LayoutDashboard, Briefcase, BookOpen, StickyNote, Library, Calendar, Sparkles, Home, Mic, BarChart3, BookPlus } from "lucide-react";
import { RecordLessonSetupModal } from "@/components/RecordLessonSetupModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Logo from "./Logo";
import NotificationsPopup from "./NotificationsPopup";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUnreadCalendarEvents } from "@/hooks/useUnreadCalendarEvents";

const studentNavigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Modo Estágio", href: "/internship", icon: Briefcase },
  { label: "Minhas Aulas", href: "/courses", icon: BookOpen },
  { label: "Minhas Anotações", href: "/annotations", icon: StickyNote },
  { label: "Biblioteca", href: "/library", icon: Library },
  { label: "Meu Cronograma", href: "/calendar", icon: Calendar },
  { label: "AI Chat", href: "/aichat", icon: Sparkles },
];

const teacherNavigationItems = [
  { label: "Home", href: "/teacherdashboard", icon: Home },
  { label: "Minhas Aulas", href: "/teacher/my-lectures", icon: BookOpen },
  { label: "Gravar Aula", href: "__modal__", icon: Mic }, // Special handling for modal
  { label: "Calendário", href: "/teachercalendar", icon: Calendar },
  { label: "Anotações", href: "/teacher/annotations", icon: StickyNote },
  { label: "Mia IA", href: "/teacher/ai-chat", icon: Sparkles },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, firstName, user } = useAuth();
  const { toast } = useToast();
  const hasUnreadEvents = useUnreadCalendarEvents();
  
  // Generate user initials from firstName
  const userInitials = firstName ? firstName[0].toUpperCase() : 'U';
  const displayName = firstName || 'Usuário';
  
  // Extract first and last name from full_name for teachers
  const fullName = user?.user_metadata?.full_name || '';
  const nameParts = fullName.split(' ').filter(Boolean);
  const firstNameFromMeta = nameParts[0] || firstName || '';
  const lastNameFromMeta = nameParts[nameParts.length - 1] || '';
  
  // Determine if we're in teacher mode based on current route
  const isTeacherMode = location.pathname.startsWith('/teacher') || location.pathname.startsWith('/livelecture') || location.pathname.startsWith('/lecturetranscription');
  
  // Teacher-specific display name and initials
  const teacherDisplayName = isTeacherMode && firstNameFromMeta && lastNameFromMeta 
    ? `Prof. ${firstNameFromMeta} ${lastNameFromMeta}`
    : displayName;
  const teacherInitials = isTeacherMode && firstNameFromMeta && lastNameFromMeta
    ? `${firstNameFromMeta[0]}${lastNameFromMeta[0]}`.toUpperCase()
    : userInitials;
  const navigationItems = isTeacherMode ? teacherNavigationItems : studentNavigationItems;

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: "Não foi possível realizar o logout. Tente novamente.",
      });
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  const NavigationLinks = ({ mobile = false }: { mobile?: boolean }) => {
    if (mobile) {
      return (
        <div className="flex flex-col gap-1">
          {navigationItems.map((item) => {
            const isCalendar = item.href === '/calendar' || item.href === '/teachercalendar';
            const showBadge = isCalendar && hasUnreadEvents;
            const isActive = location.pathname === item.href;
            
            // Special handling for "Gravar Aula" - opens modal instead of navigation
            if (item.href === '__modal__') {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setIsRecordModalOpen(true);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 text-foreground-muted hover:text-primary font-medium transition-colors text-base p-2.5 rounded-lg hover:bg-accent min-h-[44px] relative"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 font-medium transition-colors text-base p-2.5 rounded-lg min-h-[44px] relative",
                  isActive 
                    ? "text-primary bg-accent" 
                    : "text-foreground-muted hover:text-primary hover:bg-accent"
                )}
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5 shrink-0" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      );
    }

    return (
      <TooltipProvider>
        <div className="flex items-center gap-4 md:gap-6 lg:gap-8">
          {navigationItems.map((item) => {
            // Special handling for "Gravar Aula" - opens modal instead of navigation
            if (item.href === '__modal__') {
              const isActive = false; // Modal trigger is never "active"
              
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
              <button
                onClick={() => setIsRecordModalOpen(true)}
                className="flex items-center justify-center text-foreground-muted hover:text-primary transition-colors w-5 h-5"
                aria-label={item.label}
              >
                <item.icon className="h-5 w-5" />
              </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            const isActive = location.pathname === item.href;
            
            if (isActive) {
              return (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-2 text-primary font-medium transition-colors text-sm h-5"
              aria-label={item.label}
            >
              <item.icon className="h-5 w-5" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
              );
            }

            const isCalendar = item.href === '/calendar' || item.href === '/teachercalendar';
            const showBadge = isCalendar && hasUnreadEvents;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    className="flex items-center justify-center text-foreground-muted hover:text-primary transition-colors relative w-5 h-5"
                    aria-label={item.label}
                  >
                    <item.icon className="h-5 w-5" />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  };

  const UserSection = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "flex items-center gap-4",
      mobile && "flex-col gap-4 w-full"
    )}>
      {/* Notification Bell */}
      <NotificationsPopup mobile={mobile} />

      {/* User Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "gap-2 hover:bg-accent",
              mobile && "w-full justify-start"
            )}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-semibold">{teacherInitials}</span>
            </div>
            {!mobile && <span className="font-medium">{teacherDisplayName}</span>}
            {mobile && <span className="font-medium ml-1">{teacherDisplayName}</span>}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>
            <Link to={isTeacherMode ? "/teacherprofilesettings" : "/profile"} className="w-full">Meu Perfil</Link>
          </DropdownMenuItem>
          {!isTeacherMode && (
            <>
              <DropdownMenuItem>
                <Link to="/grades" className="w-full">Minhas Notas</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/quiz-performance" className="w-full">Desempenho nos Quizzes</Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem>
            <Link to={isTeacherMode ? "/teacherconfigurations" : "/settings"} className="w-full">Configurações</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Ajuda</DropdownMenuItem>
          <DropdownMenuItem 
            className="text-destructive cursor-pointer"
            onClick={handleSignOut}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Saindo..." : "Sair"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-[100] w-full border-b bg-white shadow-sm [transform:translateZ(0)] will-change-transform">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Logo */}
            <Logo className="h-8 w-auto md:h-7 lg:h-8" />

            {/* Desktop Navigation */}
            <nav className="hidden md:block">
              <NavigationLinks />
            </nav>

            {/* Desktop User Section */}
            <div className="hidden md:flex">
              <UserSection />
            </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  {!isOpen && <Menu className="h-5 w-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b">
                    <Logo className="text-base" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    <NavigationLinks mobile />
                    
                    {/* Separator */}
                    <div className="mx-0 my-3 border-t border-border"></div>
                    
                    {/* User Section integrated into main menu */}
                    <div className="flex flex-col gap-1">
                      <div className="px-0 mb-1">
                        <NotificationsPopup mobile />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-foreground-muted hover:text-primary font-medium transition-colors text-base p-2.5 rounded-lg hover:bg-accent min-h-[44px]"
                          >
                            <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                              <span className="text-white text-xs font-semibold">{teacherInitials}</span>
                            </div>
                            <span className="font-medium flex-1 text-left truncate">{teacherDisplayName}</span>
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem>
                            <Link to={isTeacherMode ? "/teacherprofilesettings" : "/profile"} className="w-full">Meu Perfil</Link>
                          </DropdownMenuItem>
                          {!isTeacherMode && (
                            <>
                              <DropdownMenuItem>
                                <Link to="/grades" className="w-full">Minhas Notas</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link to="/quiz-performance" className="w-full">Desempenho nos Quizzes</Link>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem>
                            <Link to={isTeacherMode ? "/teacherconfigurations" : "/settings"} className="w-full">Configurações</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Ajuda</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive cursor-pointer"
                            onClick={handleSignOut}
                            disabled={isLoggingOut}
                          >
                            {isLoggingOut ? "Saindo..." : "Sair"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          </div>
        </div>
      </header>
      
      {/* Record Lesson Setup Modal */}
      <RecordLessonSetupModal 
        open={isRecordModalOpen}
        onOpenChange={setIsRecordModalOpen}
      />
    </>
  );
};

export default Navbar;