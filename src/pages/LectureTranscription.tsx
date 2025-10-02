import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  BookOpen, 
  FileText,
  Users,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MainLayout from '@/components/MainLayout';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface StructuredContent {
  titulo_aula: string;
  resumo: string;
  topicos_principais: Array<{
    conceito: string;
    definicao: string;
  }>;
  referencias_externas: Array<{
    titulo: string;
    url: string;
    tipo: string;
  }>;
  perguntas_revisao: Array<{
    pergunta: string;
    opcoes: string[];
    resposta_correta: string;
  }>;
  flashcards: Array<{
    termo: string;
    definicao: string;
  }>;
}

interface Lecture {
  id: string;
  title: string;
  raw_transcript: string;
  structured_content: StructuredContent | null;
  status: 'processing' | 'ready' | 'published';
  class_id: string | null;
  duration: number;
  created_at: string;
}

const LectureTranscription = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchLecture();
    fetchClasses();
  }, [id]);

  const fetchLecture = async () => {
    try {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const lectureData: Lecture = {
        id: data.id,
        title: data.title,
        raw_transcript: data.raw_transcript,
        structured_content: data.structured_content ? data.structured_content as unknown as StructuredContent : null,
        status: data.status as 'processing' | 'ready' | 'published',
        class_id: data.class_id,
        duration: data.duration,
        created_at: data.created_at
      };

      setLecture(lectureData);

      // If lecture is still processing and no structured content, trigger AI processing
      if (lectureData.status === 'processing' && !lectureData.structured_content) {
        processTranscript();
      }
    } catch (error) {
      console.error('Error fetching lecture:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar a aula",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const processTranscript = async () => {
    if (!lecture || !user) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-lecture-transcript', {
        body: {
          lectureId: lecture.id,
          transcript: lecture.raw_transcript,
          topic: lecture.title
        }
      });

      if (error) throw error;

      if (data.structuredContent) {
        setLecture(prev => prev ? {
          ...prev,
          structured_content: data.structuredContent,
          status: 'ready'
        } : null);

        toast({
          title: "Processamento concluído!",
          description: "O material didático foi gerado pela IA",
        });
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast({
        variant: "destructive",
        title: "Erro no processamento",
        description: "Não foi possível processar a transcrição com IA",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!lecture || !selectedClass) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Selecione uma turma antes de publicar",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('lectures')
        .update({
          status: 'published',
          class_id: selectedClass
        })
        .eq('id', lecture.id);

      if (error) throw error;

      toast({
        title: "Aula publicada!",
        description: "Os alunos já podem acessar o conteúdo",
      });

      navigate('/teacher/dashboard');
    } catch (error) {
      console.error('Error publishing lecture:', error);
      toast({
        variant: "destructive",
        title: "Erro ao publicar",
        description: "Não foi possível publicar a aula",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <BackgroundRippleEffect className="opacity-30" />
          </div>
          <div className="relative z-10 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white text-lg">Carregando aula...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!lecture) {
    return (
      <MainLayout>
        <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <BackgroundRippleEffect className="opacity-30" />
          </div>
          <div className="relative z-10 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-white text-lg">Aula não encontrada</p>
            <Button 
              onClick={() => navigate('/teacher/dashboard')}
              className="mt-4 bg-purple-600 hover:bg-purple-700"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        {/* Background effect */}
        <div className="absolute inset-0 z-0">
          <BackgroundRippleEffect className="opacity-30" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Centro de Publicação Inteligente
                </h1>
                <p className="text-slate-400">
                  Revise, edite e publique o material gerado pela IA
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`
                    ${lecture.status === 'processing' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' : ''}
                    ${lecture.status === 'ready' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : ''}
                    ${lecture.status === 'published' ? 'bg-green-500/20 border-green-500/30 text-green-400' : ''}
                  `}
                >
                  {lecture.status === 'processing' && 'Processando'}
                  {lecture.status === 'ready' && 'Pronto para Publicar'}
                  {lecture.status === 'published' && 'Publicado'}
                </Badge>
                
                {lecture.duration && (
                  <Badge variant="outline" className="bg-slate-700/50 border-slate-600 text-slate-300">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDuration(lecture.duration)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Generated Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Processing State */}
              {isProcessing && (
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                      <div>
                        <h3 className="text-white font-semibold mb-1">
                          Processando com IA...
                        </h3>
                        <p className="text-sm text-slate-400">
                          A Gemini 2.5 Pro está analisando a transcrição e gerando material didático estruturado
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Structured Content Display */}
              {lecture.structured_content && (
                <>
                  {/* Title */}
                  <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-purple-400" />
                        Título da Aula
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={lecture.structured_content.titulo_aula}
                        className="bg-slate-900/50 border-slate-600 text-white text-lg font-semibold"
                        readOnly
                      />
                    </CardContent>
                  </Card>

                  {/* Summary */}
                  <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        Resumo da Aula
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Síntese gerada automaticamente pela IA
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-slate-300 leading-relaxed">
                          {lecture.structured_content.resumo}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Main Topics */}
                  <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-400" />
                        Conceitos Fundamentais
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Tópicos principais identificados pela IA
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        <div className="space-y-4 pr-4">
                          {lecture.structured_content.topicos_principais.map((topico, idx) => (
                            <div 
                              key={idx}
                              className="bg-slate-900/50 rounded-lg p-4 border border-slate-700"
                            >
                              <h4 className="text-purple-300 font-semibold mb-2">
                                {topico.conceito}
                              </h4>
                              <p className="text-slate-300 text-sm leading-relaxed">
                                {topico.definicao}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* References */}
                  {lecture.structured_content.referencias_externas.length > 0 && (
                    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white">
                          Referências Sugeridas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {lecture.structured_content.referencias_externas.map((ref, idx) => (
                            <a
                              key={idx}
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-3 border border-slate-700 hover:border-purple-500 transition-colors group"
                            >
                              <Badge variant="outline" className="bg-purple-500/20 border-purple-500/30 text-purple-400">
                                {ref.tipo}
                              </Badge>
                              <span className="text-slate-300 group-hover:text-purple-400 transition-colors flex-1">
                                {ref.titulo}
                              </span>
                              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400" />
                            </a>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quiz Questions */}
                  <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Perguntas de Revisão
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {lecture.structured_content.perguntas_revisao.length} perguntas práticas geradas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        <div className="space-y-6 pr-4">
                          {lecture.structured_content.perguntas_revisao.map((pergunta, idx) => (
                            <div 
                              key={idx}
                              className="bg-slate-900/50 rounded-lg p-4 border border-slate-700"
                            >
                              <p className="text-white font-medium mb-3">
                                {idx + 1}. {pergunta.pergunta}
                              </p>
                              <div className="space-y-2">
                                {pergunta.opcoes.map((opcao, optIdx) => (
                                  <div 
                                    key={optIdx}
                                    className={`p-2 rounded border ${
                                      opcao === pergunta.resposta_correta
                                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                        : 'bg-slate-800/50 border-slate-600 text-slate-300'
                                    }`}
                                  >
                                    {opcao}
                                    {opcao === pergunta.resposta_correta && (
                                      <CheckCircle2 className="h-4 w-4 inline ml-2" />
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
                  <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Flashcards Gerados
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {lecture.structured_content.flashcards.length} flashcards para memorização
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lecture.structured_content.flashcards.map((card, idx) => (
                          <div 
                            key={idx}
                            className="bg-slate-900/50 rounded-lg p-4 border border-slate-700"
                          >
                            <h4 className="text-purple-300 font-semibold mb-2 text-sm">
                              {card.termo}
                            </h4>
                            <p className="text-slate-400 text-xs leading-relaxed">
                              {card.definicao}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* Publication Settings */}
              <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-400" />
                    Configurações de Publicação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="class-select" className="text-slate-300">
                      Selecionar Turma *
                    </Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger 
                        id="class-select"
                        className="bg-slate-900/50 border-slate-600 text-white"
                      >
                        <SelectValue placeholder="Escolha uma turma" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {classes.map((cls) => (
                          <SelectItem 
                            key={cls.id} 
                            value={cls.id}
                            className="text-white focus:bg-slate-700"
                          >
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handlePublish}
                    disabled={
                      isPublishing || 
                      lecture.status === 'published' || 
                      lecture.status === 'processing' ||
                      !selectedClass
                    }
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg shadow-green-500/20 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publicando...
                      </>
                    ) : lecture.status === 'published' ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Publicado
                      </>
                    ) : (
                      'Publicar Aula'
                    )}
                  </Button>

                  {lecture.status === 'processing' && (
                    <p className="text-xs text-yellow-400 text-center">
                      Aguarde o processamento da IA concluir
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LectureTranscription;