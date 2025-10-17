import { useState } from "react";
import { Menu, X, ChevronDown, LayoutDashboard, Briefcase, BookOpen, StickyNote, Library, Calendar, Sparkles, Home, Mic, BarChart3, BookOpenCheck, BookPlus, MessageCircle } from "lucide-react";
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
  { label: "Gravar Aula", href: "/livelecture", icon: Mic },
  { label: "Chat com Mia", href: "/aichat", icon: MessageCircle },
  { label: "Calendário", href: "/teachercalendar", icon: Calendar },
  { label: "Planos de Aula", href: "/teacher/lesson-plans", icon: BookOpenCheck },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, firstName } = useAuth();
  const { toast } = useToast();
  
  // Generate user initials from firstName
  const userInitials = firstName ? firstName[0].toUpperCase() : 'U';
  const displayName = firstName || 'Usuário';
  
  // Determine if we're in teacher mode based on current route
  const isTeacherMode = location.pathname.startsWith('/teacher') || location.pathname === '/livelecture' || location.pathname === '/lecturetranscription';
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
        <div className="flex flex-col gap-2">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-3 text-foreground-muted hover:text-primary font-medium transition-colors text-lg p-3 rounded-lg hover:bg-accent min-h-[48px]"
              onClick={() => {
                setIsOpen(false);
              }}
            >
              <item.icon className="h-6 w-6 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      );
    }

    return (
      <TooltipProvider>
        <div className="flex gap-6">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            if (isActive) {
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-2 text-primary font-medium transition-colors text-sm"
                  aria-label={item.label}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    className="flex items-center text-foreground-muted hover:text-primary transition-colors"
                    aria-label={item.label}
                  >
                    <item.icon className="h-4 w-4" />
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
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">{isTeacherMode ? 'AS' : userInitials}</span>
            </div>
            {!mobile && <span className="font-medium">{isTeacherMode ? 'Prof. Ana Santos' : displayName}</span>}
            {mobile && <span className="font-medium ml-1">{isTeacherMode ? 'Prof. Ana Santos' : displayName}</span>}
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
                <Link to="/quiz-performance" className="w-full">Meu Desempenho</Link>
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
    <header className="sticky top-0 z-50 w-full border-b frost-white-subtle shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <Logo />

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
              <SheetContent side="right" className="w-full sm:w-[350px] max-w-sm">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <Logo className="text-lg" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-10 w-10"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 py-6 overflow-y-auto">
                    <NavigationLinks mobile />
                    
                    {/* Separator */}
                    <div className="mx-0 my-4 border-t border-border"></div>
                    
                    {/* User Section integrated into main menu */}
                    <div className="flex flex-col gap-2">
                      <div className="px-0">
                        <NotificationsPopup mobile />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-foreground-muted hover:text-primary font-medium transition-colors text-lg p-3 rounded-lg hover:bg-accent min-h-[48px]"
                          >
                            <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">{isTeacherMode ? 'AS' : userInitials}</span>
                            </div>
                            <span className="font-medium flex-1 text-left">{isTeacherMode ? 'Prof. Ana Santos' : displayName}</span>
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
                                <Link to="/quiz-performance" className="w-full">Meu Desempenho</Link>
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
  );
};

export default Navbar;