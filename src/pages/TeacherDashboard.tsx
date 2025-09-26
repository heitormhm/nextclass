import React, { useState } from 'react';
import { Calendar, Mic, BarChart3, BookOpen, Users, GraduationCap, TrendingUp, TrendingDown, Clock, AlertTriangle, Lightbulb, Edit, X, Megaphone, ArrowUp, ArrowDown, Minus, FileText, Brain, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import { Link } from 'react-router-dom';
import UniversalSchedulingModal from '@/components/UniversalSchedulingModal';

interface LectureDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Student {
  name: string;
  case1: number;
  midterm: number;
  final: number;
  average: number;
}

interface GradeEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

const GradeEditModal = ({ open, onOpenChange, student }: GradeEditModalProps) => {
  const [case1Grade, setCase1Grade] = useState(student?.case1.toString() || '');
  const [midtermGrade, setMidtermGrade] = useState(student?.midterm.toString() || '');
  const [finalGrade, setFinalGrade] = useState(student?.final.toString() || '');

  const handleSave = () => {
    console.log('Saving grades:', { case1Grade, midtermGrade, finalGrade });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white shadow-lg">
        <DialogHeader>
          <DialogTitle>Editar Notas de: {student?.name}</DialogTitle>
          <DialogDescription>
            Altere as notas do aluno nas avaliações disponíveis.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="case1">Caso Clínico 1 (15%)</Label>
            <Input
              id="case1"
              type="number"
              min="0"
              max="100"
              value={case1Grade}
              onChange={(e) => setCase1Grade(e.target.value)}
              placeholder="Nota do caso clínico"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="midterm">Exame Parcial (30%)</Label>
            <Input
              id="midterm"
              type="number"
              min="0"
              max="100"
              value={midtermGrade}
              onChange={(e) => setMidtermGrade(e.target.value)}
              placeholder="Nota do exame parcial"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="final">Projeto Final (55%)</Label>
            <Input
              id="final"
              type="number"
              min="0"
              max="100"
              value={finalGrade}
              onChange={(e) => setFinalGrade(e.target.value)}
              placeholder="Nota do projeto final"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const LectureDetailsModal = ({ open, onOpenChange }: LectureDetailsModalProps) => {
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [liveQA, setLiveQA] = useState(false);

  const handleStartRecording = () => {
    window.location.href = '/livelecture';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white shadow-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da Aula</DialogTitle>
          <DialogDescription>
            Configure os detalhes da sua nova aula antes de iniciar a gravação.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Matéria</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a matéria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cardiologia">Cardiologia</SelectItem>
                <SelectItem value="nefrologia">Nefrologia</SelectItem>
                <SelectItem value="pneumologia">Pneumologia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">Título da Aula</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da aula"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="live-qa"
              checked={liveQA}
              onCheckedChange={setLiveQA}
            />
            <Label htmlFor="live-qa">Ativar Q&A ao vivo para alunos</Label>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleStartRecording} className="bg-primary hover:bg-primary/90">
            Configurar Gravação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TeacherDashboard = () => {
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState('cardiologia-2025-2');
  const [selectedAssessment, setSelectedAssessment] = useState('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [activeTab, setActiveTab] = useState('insights');
  const [expandedStudents, setExpandedStudents] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');

  const statCards = [
    {
      title: 'Aulas Publicadas',
      value: '28',
      subtitle: 'sem alteração',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      trend: null,
      trendIcon: null,
    },
    {
      title: 'Alunos Ativos',
      value: '152',
      subtitle: '▲ 3%',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
      borderColor: 'border-green-200',
      trend: 'up',
      trendIcon: ArrowUp,
    },
    {
      title: 'Média da Turma',
      value: '88%',  
      subtitle: '▼ 1.5%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      trend: 'down',
      trendIcon: ArrowDown,
    },
    {
      title: 'Próxima Aula',
      value: 'Fisiologia Renal',
      subtitle: 'Hoje às 14:00',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      trend: null,
      trendIcon: null,
    },
  ];

  const upcomingEvents = [
    {
      id: '1',
      title: 'Aula: Fisiologia Renal',
      time: 'Hoje, 14:00',
      type: 'lecture',
    },
    {
      id: '2',
      title: 'Reunião do Comitê Curricular',  
      time: 'Amanhã, 10:00',
      type: 'meeting',
    },
    {
      id: '3',
      title: 'Prazo Final: Lançamento de Notas',
      time: '25/09, 18:00',
      type: 'deadline',
    },
    {
      id: '4',
      title: 'Aula: Caso Clínico de Cardiologia',
      time: '27/09, 11:00',
      type: 'lecture',
    },
  ];

  const insights = [
    {
      type: 'alert',
      title: 'Baixa Performance em Fisiologia Renal',
      text: 'A análise de IA detectou que 22% dos alunos apresentaram desempenho abaixo da média no último quiz. Um módulo de revisão sobre o "Sistema Renina-Angiotensina" é recomendado.',
      action: 'Criar Módulo de Revisão',
      icon: AlertTriangle,
    },
    {
      type: 'opportunity',
      title: 'Pico de Engajamento em Casos Clínicos',
      text: 'O engajamento via chat e anotações aumentou 35% durante a última aula baseada em caso clínico. Considere aumentar a frequência deste formato.',
      action: 'Agendar Novo Caso Clínico',
      icon: Lightbulb,
    },
  ];

  const studentGrades: Student[] = [
    { name: 'Ana Júlia Costa', case1: 95, midterm: 90, final: 88, average: 89.95 },
    { name: 'Bruno Lima', case1: 90, midterm: 82, final: 85, average: 84.85 },
    { name: 'Carla Martins', case1: 80, midterm: 75, final: 78, average: 77.35 },
    { name: 'David Santos', case1: 92, midterm: 88, final: 91, average: 90.15 },
    { name: 'Elena Ferreira', case1: 85, midterm: 79, final: 83, average: 81.85 },
  ];

  const handleEditGrade = (student: Student) => {
    setSelectedStudent(student);
    setIsGradeModalOpen(true);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'bg-blue-100 text-blue-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'deadline':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Mock sparkline data for students
  const getSparklinePoints = (student: string) => {
    const sparklines = {
      'Ana Júlia Costa': '2,8 8,6 12,4 16,7 20,5', // Trending up
      'Bruno Lima': '2,5 8,5 12,5 16,5 20,5', // Stable
      'Carla Martins': '2,7 8,4 12,2 16,6 20,8', // Dip then recovery
      'David Santos': '2,6 8,7 12,8 16,8 20,7', // Stable high
      'Elena Ferreira': '2,3 8,5 12,6 16,7 20,6', // Gradual improvement
    };
    return sparklines[student as keyof typeof sparklines] || '2,5 8,5 12,5 16,5 20,5';
  };

  const SparklineGraph = ({ points, student }: { points: string; student: string }) => (
    <svg width="60" height="25" className="inline-block">
      <polyline
        fill="none"
        stroke={student === 'Ana Júlia Costa' ? "#10b981" : 
               student === 'Carla Martins' ? "#f59e0b" : "#6b7280"}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600">
        <div className="container mx-auto px-4 py-8">
          {/* Enhanced Welcome Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-white mb-2">
              Bem-vindo de volta, Prof. Ana Santos!
            </h1>
            <p className="text-white/90 text-lg mb-2">
              Hoje é domingo, 21 de setembro de 2025.
            </p>
            <p className="text-white/80 text-base">
              Um ótimo dia para inspirar seus alunos.
            </p>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Column (70% width) */}
            <div className="lg:col-span-3 space-y-8">
              {/* Horizontal Action Bar */}
              <Card className="bg-white shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      onClick={() => setIsLectureModalOpen(true)}
                      className="bg-[#EC4899] hover:bg-[#EC4899]/90 text-white flex items-center gap-2 h-12 transition-colors"
                    >
                      <Mic className="h-5 w-5" />
                      + Gravar Nova Aula
                    </Button>
                    <Button 
                      onClick={() => setIsSchedulingModalOpen(true)}
                      className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white flex items-center gap-2 h-12 transition-colors"
                    >
                      <Calendar className="h-5 w-5" />
                      + Agendar Evento
                    </Button>
                    <Button 
                      onClick={() => setIsAnnouncementModalOpen(true)}
                      className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white flex items-center gap-2 h-12 transition-colors"
                    >
                      <Megaphone className="h-5 w-5" />
                      + Enviar Anúncio à Turma
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Visão Geral - Stat Cards with Trends */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, index) => (
                  <Card key={index} className={`bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover-scale border-l-4 ${card.borderColor}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                          <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                          <div className="flex items-center gap-1">
                            {card.trend === 'up' && (
                              <ArrowUp className="h-3 w-3 text-green-600" />
                            )}
                            {card.trend === 'down' && (
                              <ArrowDown className="h-3 w-3 text-red-600" />
                            )}
                            <p className={`text-xs ${
                              card.trend === 'up' ? 'text-green-600' : 
                              card.trend === 'down' ? 'text-red-600' : 
                              'text-gray-500'
                            }`}>
                              {card.subtitle}
                            </p>
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg ${card.bgColor}`}>
                          <card.icon className={`h-6 w-6 ${card.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Main Tabbed Interface */}
              <Card className="bg-white shadow-lg">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  {/* Unified Panel Header */}
                  <CardHeader className="pb-0 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                        <TabsTrigger value="insights" className="flex items-center gap-2 relative">
                          <Lightbulb className="h-4 w-4" />
                          Insights da Turma
                        </TabsTrigger>
                        <TabsTrigger value="grades" className="flex items-center gap-2 relative">
                          <BarChart3 className="h-4 w-4" />
                          Gerenciador de Notas
                        </TabsTrigger>
                      </TabsList>
                      
                      {/* Class Selector integrated into header */}
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-600 whitespace-nowrap">
                          Turma:
                        </Label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Selecione a turma" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cardiologia-2025-2">Cardiologia - 2025/2</SelectItem>
                            <SelectItem value="nefrologia-2025-2">Nefrologia - 2025/2</SelectItem>
                            <SelectItem value="pneumologia-2025-2">Pneumologia - 2025/2</SelectItem>
                            <SelectItem value="cardiologia-2025-1">Cardiologia - 2025/1</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <TabsContent value="insights" className="mt-0">

                      {/* Enhanced Insight Cards - Mobile optimized single column */}
                      <div className="grid grid-cols-1 gap-6 mb-8">
                        {/* Alert Card */}
                        <Card className="border shadow-sm bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col items-center text-center mb-4">
                              <div className="p-3 sm:p-4 rounded-full bg-red-500/10 mb-3 sm:mb-4">
                                <AlertTriangle className="h-8 w-8 sm:h-12 sm:w-12 text-red-600" />
                              </div>
                              <h3 className="text-lg sm:text-xl font-bold text-red-800 mb-2">
                                Baixa Performance em Fisiologia Renal
                              </h3>
                              <p className="text-sm text-red-700 leading-relaxed mb-4 sm:mb-6">
                                22% dos alunos apresentaram desempenho abaixo da média no último quiz.
                              </p>
                            </div>
                            <Button
                              className="w-full bg-[#EC4899] hover:bg-[#EC4899]/90 text-white font-semibold py-3 h-auto transition-all hover:shadow-lg min-h-[48px]"
                            >
                              Criar Módulo de Revisão
                            </Button>
                          </CardContent>
                        </Card>

                        {/* Opportunity Card */}
                        <Card className="border shadow-sm bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col items-center text-center mb-4">
                              <div className="p-3 sm:p-4 rounded-full bg-green-500/10 mb-3 sm:mb-4">
                                <Lightbulb className="h-8 w-8 sm:h-12 sm:w-12 text-green-600" />
                              </div>
                              <h3 className="text-lg sm:text-xl font-bold text-green-800 mb-2">
                                Pico de Engajamento em Casos Clínicos
                              </h3>
                              <p className="text-sm text-green-700 leading-relaxed mb-4 sm:mb-6">
                                O engajamento via chat e anotações aumentou 35% na última aula.
                              </p>
                            </div>
                            <Button
                              className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white font-semibold py-3 h-auto transition-all hover:shadow-lg min-h-[48px]"
                            >
                              Agendar Novo Caso Clínico
                            </Button>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Resumo da Turma - Mobile optimized */}
                      <Card className="border shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <span>Resumo da Turma</span>
                            <Button
                              variant="outline"
                              size="sm" 
                              onClick={() => setExpandedStudents(!expandedStudents)}
                              className="hover-scale flex items-center justify-center gap-2 px-4 py-2 h-auto min-h-[44px] w-full sm:w-auto"
                            >
                              {expandedStudents ? (
                                <>
                                  <ArrowUp className="h-4 w-4" />
                                  Recolher
                                </>
                              ) : (
                                <>
                                  <ArrowDown className="h-4 w-4" />
                                  Ver Desempenho Detalhado
                                </>
                              )}
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {!expandedStudents ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Compact Stat Cards - Mobile first */}
                              <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
                                  <TrendingUp className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-blue-900">88%</p>
                                  <p className="text-sm text-blue-700">Média da Turma</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                                <div className="p-2 bg-green-500/10 rounded-lg mr-3">
                                  <Users className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-green-900">Alto</p>
                                  <p className="text-sm text-green-700">Engajamento</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200 sm:col-span-2 lg:col-span-1">
                                <div className="p-2 bg-purple-500/10 rounded-lg mr-3">
                                  <GraduationCap className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-purple-900">24</p>
                                  <p className="text-sm text-purple-700">Alunos Ativos</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Mobile Cards for Grade Management */}
                              <div className="block md:hidden space-y-4">
                                {studentGrades.map((student, index) => (
                                  <Card key={index} className="p-4 border border-gray-200">
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-foreground">{student.name}</h4>
                                        <Badge variant={student.average >= 85 ? 'default' : 'secondary'}>
                                          {student.average >= 85 ? 'Alto' : 'Médio'}
                                        </Badge>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <span className="text-foreground-muted">Nota Parcial:</span>
                                          <div className="font-medium">{student.midterm}%</div>
                                        </div>
                                        <div>
                                          <span className="text-foreground-muted">Média Final:</span>
                                          <div className="font-medium">{student.average.toFixed(1)}%</div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-foreground-muted">Tendência:</span>
                                          <SparklineGraph 
                                            points={getSparklinePoints(student.name)} 
                                            student={student.name}
                                          />
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditGrade(student)}
                                          className="hover-scale min-h-[36px]"
                                        >
                                          <Edit className="w-3 h-3 mr-1" />
                                          Editar
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                              
                              {/* Desktop Table - hidden on mobile */}
                              <div className="hidden md:block">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
                                  <div>Nome do Aluno</div>
                                  <div>Nota Parcial</div>
                                  <div>Engajamento</div>
                                  <div>Tendência de Notas</div>
                                  <div>Média Final</div>
                                  <div>Ações</div>
                                </div>
                                {studentGrades.map((student, index) => (
                                  <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <div className="font-medium text-gray-900">{student.name}</div>
                                    <div className="text-gray-700">{student.midterm}%</div>
                                    <div>
                                      <Badge variant={student.average >= 85 ? 'default' : 'secondary'}>
                                        {student.average >= 85 ? 'Alto' : 'Médio'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <SparklineGraph 
                                        points={getSparklinePoints(student.name)} 
                                        student={student.name}
                                      />
                                    </div>
                                    <div className="font-semibold text-gray-900">{student.average.toFixed(1)}%</div>
                                    <div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditGrade(student)}
                                        className="hover-scale"
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Editar
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="grades" className="mt-0">
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1">
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Filtrar por avaliação:
                            </Label>
                            <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a avaliação" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas as Avaliações</SelectItem>
                                <SelectItem value="case1">Caso Clínico 1</SelectItem>
                                <SelectItem value="midterm">Exame Parcial</SelectItem>
                                <SelectItem value="final">Projeto Final</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              Buscar aluno:
                            </Label>
                            <Input
                              placeholder="Digite o nome do aluno..."
                              value={searchStudent}
                              onChange={(e) => setSearchStudent(e.target.value)}
                            />
                          </div>
                        </div>

                        <Card className="border">
                          <CardContent className="p-0">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caso 1 (15%)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parcial (30%)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final (55%)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Média</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {studentGrades
                                    .filter(student => 
                                      student.name.toLowerCase().includes(searchStudent.toLowerCase())
                                    )
                                    .map((student, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {student.name}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {student.case1}%
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {student.midterm}%
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {student.final}%
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        {student.average.toFixed(1)}%
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditGrade(student)}
                                          className="hover-scale"
                                        >
                                          <Edit className="w-4 h-4 mr-1" />
                                          Editar
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>

            {/* Action & Events Hub Sidebar (30% width) */}
            <div className="lg:col-span-1 space-y-6">
              {/* Próximos Eventos */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Próximos Eventos
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSchedulingModalOpen(true)}
                      className="hover-scale"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      + Agendar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1">
                            {event.title}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {event.time}
                          </p>
                        </div>
                        <Badge className={getEventTypeColor(event.type)}>
                          {event.type === 'lecture' ? 'Aula' : 
                           event.type === 'meeting' ? 'Reunião' : 'Prazo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Announcement Modal */}
          <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
            <DialogContent className="sm:max-w-[425px] bg-white shadow-lg">
              <DialogHeader>
                <DialogTitle>Enviar Anúncio à Turma</DialogTitle>
                <DialogDescription>
                  Envie uma mensagem importante para todos os alunos da turma selecionada.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="announcement-class">Turma</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardiologia-2025-2">Cardiologia - 2025/2</SelectItem>
                      <SelectItem value="nefrologia-2025-2">Nefrologia - 2025/2</SelectItem>
                      <SelectItem value="pneumologia-2025-2">Pneumologia - 2025/2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="announcement">Mensagem</Label>
                  <Textarea
                    id="announcement"
                    placeholder="Digite sua mensagem aqui..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAnnouncementModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsAnnouncementModalOpen(false)} className="bg-primary hover:bg-primary/90">
                  Enviar Anúncio
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Modals */}
      <LectureDetailsModal open={isLectureModalOpen} onOpenChange={setIsLectureModalOpen} />
      <GradeEditModal open={isGradeModalOpen} onOpenChange={setIsGradeModalOpen} student={selectedStudent} />
      <UniversalSchedulingModal 
        open={isSchedulingModalOpen} 
        onOpenChange={setIsSchedulingModalOpen}
      />
    </MainLayout>
  );
};

export default TeacherDashboard;