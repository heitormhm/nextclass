import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, BookOpen, FileText, ExternalLink, Check, Sparkles, Upload, FileUp, Image as ImageIcon, Users, CheckSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import MainLayout from '@/components/MainLayout';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { EditWithAIModal } from '@/components/EditWithAIModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StructuredContent {
  titulo_aula: string;
  resumo: string;
  topicos_principais: Array<{ conceito: string; definicao: string }>;
  referencias_externas: Array<{ titulo: string; url: string; tipo: string }>;
  perguntas_revisao: Array<{ pergunta: string; opcoes: string[]; resposta_correta: string }>;
  flashcards: Array<{ termo: string; definicao: string }>;
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
}

interface Student {
  id: string;
  name: string;
  hasAccess: boolean;
}

const LectureTranscriptionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lecture, setLecture] = useState<any>(null);
  const [structuredContent, setStructuredContent] = useState<StructuredContent | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [lectureTitle, setLectureTitle] = useState('');
  
  // Edit with AI modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [editingSectionContent, setEditingSectionContent] = useState<any>(null);

  // Thumbnail state
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  // Materials state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Lesson plan comparison state
  const [lessonPlanText, setLessonPlanText] = useState('');
  const [isComparingPlan, setIsComparingPlan] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // Student access state
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  useEffect(() => {
    if (id) {
      loadLectureData();
      loadClasses();
    }
  }, [id]);

  useEffect(() => {
    if (structuredContent?.titulo_aula && !thumbnailUrl) {
      generateThumbnail(structuredContent.titulo_aula);
    }
  }, [structuredContent]);

  useEffect(() => {
    if (selectedClassId) {
      loadStudents(selectedClassId);
    }
  }, [selectedClassId]);

  const loadLectureData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('lectures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setLecture(data);
      setLectureTitle(data?.title || 'Nova Aula');

      if (data?.structured_content) {
        setStructuredContent(data.structured_content as StructuredContent);
        setLectureTitle(data.structured_content.titulo_aula || data?.title || 'Nova Aula');
      } else if (data?.status === 'processing' && data?.raw_transcript) {
        processTranscript(data.raw_transcript);
      }
    } catch (error) {
      console.error('Error loading lecture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar aula',
        description: 'Não foi possível carregar os dados da aula',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadStudents = async (classId: string) => {
    // Mock data - in production, fetch from database
    const mockStudents: Student[] = [
      { id: '1', name: 'Ana Silva', hasAccess: true },
      { id: '2', name: 'Bruno Costa', hasAccess: true },
      { id: '3', name: 'Carlos Mendes', hasAccess: true },
      { id: '4', name: 'Diana Santos', hasAccess: false },
      { id: '5', name: 'Eduardo Lima', hasAccess: true },
    ];
    setStudents(mockStudents);
  };

  const processTranscript = async (transcript: string) => {
    try {
      setIsProcessing(true);
      toast({
        title: 'Processando transcrição',
        description: 'A IA está gerando o material didático...',
      });

      const { data, error } = await supabase.functions.invoke('process-lecture-transcript', {
        body: { 
          lectureId: id, 
          transcript
        }
      });

      if (error) throw error;

      if (data?.structuredContent) {
        setStructuredContent(data.structuredContent);
        setLectureTitle(data.structuredContent.titulo_aula || 'Nova Aula');
        toast({
          title: 'Processamento concluído',
          description: 'Material didático gerado com sucesso',
        });
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no processamento',
        description: 'Não foi possível processar a transcrição',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateThumbnail = async (topic: string) => {
    try {
      setIsGeneratingThumbnail(true);
      const { data, error } = await supabase.functions.invoke('generate-lecture-thumbnail', {
        body: { topic }
      });

      if (error) throw error;
      if (data?.imageUrl) {
        setThumbnailUrl(data.imageUrl);
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleFileUpload = (files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast({
      title: 'Arquivos adicionados',
      description: `${files.length} arquivo(s) carregado(s)`,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleCompareLessonPlan = async () => {
    if (!lessonPlanText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Plano de aula vazio',
        description: 'Por favor, insira o plano de aula',
      });
      return;
    }

    try {
      setIsComparingPlan(true);
      const { data, error } = await supabase.functions.invoke('compare-with-lesson-plan', {
        body: {
          lessonPlan: lessonPlanText,
          lectureContent: structuredContent,
        },
      });

      if (error) throw error;
      setComparisonResult(data.comparison);
      toast({
        title: 'Análise concluída',
        description: 'Relatório de cobertura gerado',
      });
    } catch (error) {
      console.error('Error comparing lesson plan:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na comparação',
        description: 'Não foi possível comparar com o plano de aula',
      });
    } finally {
      setIsComparingPlan(false);
    }
  };

  const openEditModal = (sectionTitle: string, sectionContent: any) => {
    setEditingSectionTitle(sectionTitle);
    setEditingSectionContent(sectionContent);
    setIsEditModalOpen(true);
  };

  const handleContentUpdate = (updatedContent: any) => {
    if (!structuredContent) return;
    
    const newContent = { ...structuredContent, ...updatedContent };
    setStructuredContent(newContent);
  };

  const handlePublish = async () => {
    if (!selectedClassId) {
      toast({
        variant: 'destructive',
        title: 'Selecione uma turma',
        description: 'É necessário selecionar uma turma para publicar',
      });
      return;
    }

    try {
      setIsPublishing(true);

      const { error } = await (supabase as any)
        .from('lectures')
        .update({
          title: lectureTitle,
          class_id: selectedClassId,
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Aula publicada',
        description: 'A aula foi publicada com sucesso',
      });

      setTimeout(() => {
        navigate('/teacherdashboard');
      }, 1500);
    } catch (error) {
      console.error('Error publishing lecture:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao publicar',
        description: 'Não foi possível publicar a aula',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <BackgroundRippleEffect className="opacity-30" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-purple-400 animate-spin" />
            <p className="text-white text-lg">Carregando aula...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute inset-0 z-0">
          <BackgroundRippleEffect className="opacity-30" />
        </div>

        {/* Gradient Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-purple-400" />
                Centro de Publicação Inteligente
              </h1>
              <p className="text-slate-400">
                Revise, edite e publique seu material didático gerado por IA
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={`
                  ${lecture?.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : ''}
                  ${lecture?.status === 'ready' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : ''}
                  ${lecture?.status === 'published' ? 'bg-green-500/20 text-green-300 border-green-500/30' : ''}
                `}
              >
                {lecture?.status === 'processing' && 'Processando'}
                {lecture?.status === 'ready' && 'Rascunho'}
                {lecture?.status === 'published' && 'Publicado'}
              </Badge>
              <Button
                onClick={handlePublish}
                disabled={!selectedClassId || isPublishing || !structuredContent}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Publicar Aula
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Processing state */}
          {isProcessing && (
            <Card className="bg-slate-800/50 border-slate-700 mb-8">
              <CardContent className="flex items-center gap-4 py-6">
                <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    Processando com IA...
                  </h3>
                  <p className="text-slate-400 text-sm">
                    A IA está analisando a transcrição e gerando material didático estruturado
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main content grid */}
          {structuredContent && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
              {/* Left column - Generated content */}
              <div className="space-y-6">
                {/* Title */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Título da Aula</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={lectureTitle}
                      onChange={(e) => setLectureTitle(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-white"
                      placeholder="Digite o título da aula"
                    />
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-400" />
                      Resumo da Aula
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal('Resumo', { resumo: structuredContent.resumo })}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Editar com IA
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300 leading-relaxed">
                      {structuredContent.resumo}
                    </p>
                  </CardContent>
                </Card>

                {/* Main topics */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-400" />
                      Tópicos Principais
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal('Tópicos', { topicos_principais: structuredContent.topicos_principais })}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Editar com IA
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {structuredContent.topicos_principais.map((topico, index) => (
                        <div key={index} className="border-l-2 border-purple-500 pl-4">
                          <h4 className="text-white font-semibold mb-2">
                            {topico.conceito}
                          </h4>
                          <p className="text-slate-400 text-sm">
                            {topico.definicao}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* References */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-purple-400" />
                      Referências Externas
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal('Referências', { referencias_externas: structuredContent.referencias_externas })}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Editar com IA
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {structuredContent.referencias_externas.map((ref, index) => (
                        <a
                          key={index}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors border border-slate-700"
                        >
                          <ExternalLink className="h-5 w-5 text-purple-400 mt-1 shrink-0" />
                          <div className="flex-1">
                            <p className="text-white font-medium mb-1">{ref.titulo}</p>
                            <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                              {ref.tipo}
                            </Badge>
                          </div>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz questions */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">
                      Perguntas de Revisão ({structuredContent.perguntas_revisao.length})
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal('Perguntas', { perguntas_revisao: structuredContent.perguntas_revisao })}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Editar com IA
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-6">
                        {structuredContent.perguntas_revisao.map((pergunta, index) => (
                          <div key={index} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                            <p className="text-white font-medium mb-3">
                              {index + 1}. {pergunta.pergunta}
                            </p>
                            <div className="space-y-2">
                              {pergunta.opcoes.map((opcao, opIndex) => (
                                <div
                                  key={opIndex}
                                  className={`p-3 rounded ${
                                    opcao.startsWith(pergunta.resposta_correta)
                                      ? 'bg-green-500/20 border border-green-500/30'
                                      : 'bg-slate-800/50'
                                  }`}
                                >
                                  <span className="text-slate-300 text-sm">{opcao}</span>
                                  {opcao.startsWith(pergunta.resposta_correta) && (
                                    <Check className="inline-block h-4 w-4 text-green-400 ml-2" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Flashcards */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">
                      Flashcards ({structuredContent.flashcards.length})
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal('Flashcards', { flashcards: structuredContent.flashcards })}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Editar com IA
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {structuredContent.flashcards.map((card, index) => (
                        <div
                          key={index}
                          className="bg-slate-900/50 rounded-lg p-4 border border-slate-700"
                        >
                          <h4 className="text-purple-400 font-semibold mb-2">
                            {card.termo}
                          </h4>
                          <p className="text-slate-300 text-sm">
                            {card.definicao}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column - Tools and actions */}
              <div className="space-y-6">
                {/* Thumbnail panel */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-purple-400" />
                      Thumbnail da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isGeneratingThumbnail ? (
                      <div className="flex items-center justify-center h-40 bg-slate-900/50 rounded-lg border border-slate-700">
                        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                      </div>
                    ) : thumbnailUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-700">
                        <img
                          src={thumbnailUrl}
                          alt="Thumbnail da aula"
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-40 bg-slate-900/50 rounded-lg border border-dashed border-slate-600">
                        <p className="text-slate-400 text-sm">Nenhuma thumbnail</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => generateThumbnail(lectureTitle)}
                        disabled={isGeneratingThumbnail}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        size="sm"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Gerar Outra
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 bg-slate-700 border-slate-600 hover:bg-slate-600"
                        size="sm"
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Materials panel */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-purple-400" />
                      Materiais Suplementares
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragging
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-600 bg-slate-900/50'
                      }`}
                    >
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm mb-2">
                        Arraste arquivos ou clique para selecionar
                      </p>
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-slate-700 border-slate-600"
                          asChild
                        >
                          <span>Selecionar Arquivos</span>
                        </Button>
                      </label>
                    </div>
                    {uploadedFiles.length > 0 && (
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 bg-slate-900/50 rounded border border-slate-700"
                            >
                              <FileText className="h-4 w-4 text-purple-400 shrink-0" />
                              <span className="text-slate-300 text-xs truncate flex-1">
                                {file.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Lesson plan comparison */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Análise da Aula</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Dialog open={isComparisonModalOpen} onOpenChange={setIsComparisonModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Comparar com Plano de Aula
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Comparar com Plano de Aula</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-white mb-2">Cole o plano de aula</Label>
                            <Textarea
                              value={lessonPlanText}
                              onChange={(e) => setLessonPlanText(e.target.value)}
                              placeholder="Cole aqui o plano de aula..."
                              className="min-h-[200px] bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                          <Button
                            onClick={handleCompareLessonPlan}
                            disabled={isComparingPlan || !lessonPlanText.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                          >
                            {isComparingPlan ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analisando...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Analisar Cobertura
                              </>
                            )}
                          </Button>
                          {comparisonResult && (
                            <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                              <h3 className="text-white font-semibold mb-2">
                                Cobertura: {comparisonResult.coverage_percentage}%
                              </h3>
                              <div className="space-y-2 text-sm">
                                {comparisonResult.missing_topics?.length > 0 && (
                                  <div>
                                    <p className="text-orange-400 font-medium">Tópicos não abordados:</p>
                                    <ul className="text-slate-400 ml-4">
                                      {comparisonResult.missing_topics.map((topic: any, i: number) => (
                                        <li key={i}>• {topic.topic}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                {/* Student access control */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-400" />
                      Controle de Acesso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Buscar aluno..."
                        className="pl-9 bg-slate-900/50 border-slate-600 text-white"
                      />
                    </div>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {filteredStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center gap-2 p-2 bg-slate-900/50 rounded border border-slate-700"
                          >
                            <Checkbox
                              checked={student.hasAccess}
                              onCheckedChange={(checked) => {
                                setStudents(prev =>
                                  prev.map(s =>
                                    s.id === student.id ? { ...s, hasAccess: !!checked } : s
                                  )
                                );
                              }}
                              className="border-slate-600"
                            />
                            <span className="text-slate-300 text-sm">{student.name}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Publication settings */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Configurações de Publicação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-white text-xs mb-2">Turma</Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                          <SelectValue placeholder="Selecione a turma" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id} className="text-white">
                              {cls.name} - {cls.course}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Estatísticas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tópicos</span>
                      <span className="text-white font-semibold">{structuredContent.topicos_principais.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Perguntas</span>
                      <span className="text-white font-semibold">{structuredContent.perguntas_revisao.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Flashcards</span>
                      <span className="text-white font-semibold">{structuredContent.flashcards.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Referências</span>
                      <span className="text-white font-semibold">{structuredContent.referencias_externas.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Materiais</span>
                      <span className="text-white font-semibold">{uploadedFiles.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Edit with AI Modal */}
        <EditWithAIModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          sectionTitle={editingSectionTitle}
          currentContent={editingSectionContent}
          onUpdate={handleContentUpdate}
          lectureId={id || ''}
        />
      </div>
    </MainLayout>
  );
};

export default LectureTranscriptionPage;
