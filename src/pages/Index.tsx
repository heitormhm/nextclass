import { Search, BookOpen, Users, Library, Calendar, Trophy, Star, BookMarked, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import MainLayout from "@/components/MainLayout";

const Index = () => {
  const stats = [
    { label: "Tópicos Dominados", value: "12/15", icon: BookOpen, color: "text-primary" },
    { label: "Meta de Estudo Semanal", value: "10h/12h", icon: Calendar, color: "text-blue-600" },
    { label: "Prontidão para Prova", value: "85%", icon: Trophy, color: "text-success" },
  ];

  const quickActions = [
    { title: "Minhas Aulas", icon: BookOpen, color: "bg-primary", href: "/courses" },
    { title: "Modo Estágio", icon: Users, color: "bg-blue-500", href: "/internship" },
    { title: "Minhas Anotações", icon: BookMarked, color: "bg-purple-500", href: "/annotations" },
    { title: "Biblioteca", icon: Library, color: "bg-orange-500", href: "/library" },
    { title: "Meu Cronograma", icon: Calendar, color: "bg-green-500", href: "/calendar" },
  ];

  const todaysSchedule = [
    {
      title: "Revisar Aula: Cardiologia",
      time: "10:00 - 11:00",
      icon: BookOpen,
      color: "bg-primary",
    },
    {
      title: "Estudo de Caso: Cardiologia", 
      time: "11:00 - 12:00",
      icon: Users,
      color: "bg-pink-500",
    },
    {
      title: "Simulação de Cirurgia",
      time: "14:00 - 15:00", 
      icon: Star,
      color: "bg-purple-500",
    },
    {
      title: "Discussão em Grupo: Neurologia",
      time: "16:00 - 17:00",
      icon: Users,
      color: "bg-blue-500",
    },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo de volta, António!</h1>
          <p className="text-foreground-muted mb-4">Continue sua jornada de aprendizado médico</p>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Button asChild className="bg-primary hover:bg-primary-light">
              <a href="/dashboard">
                Acessar Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/auth">
                Fazer Login
              </a>
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted h-4 w-4" />
            <Input
              placeholder="Pergunte ao assistente de IA sobre qualquer tópico médico..."
              className="pl-10 bg-background-secondary border-none"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {stats.map((stat, index) => (
                <Card key={index} className="bg-card-secondary border-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground-muted mb-1">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-2xl font-semibold mb-6">Menu Rápido</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-accent group"
                    asChild
                  >
                    <a href={action.href}>
                      <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium text-center">
                        {action.title}
                      </span>
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">
                  Trilha de Aprendizagem de Hoje
                </h3>
                <div className="space-y-4">
                  {todaysSchedule.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 group">
                      <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center text-white`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-foreground-muted">{item.time}</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-light text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        asChild
                      >
                        <a href="/lecture/1">
                          Começar
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;