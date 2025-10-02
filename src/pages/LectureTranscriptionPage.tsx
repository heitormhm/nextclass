import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, BookOpen, FileText, ExternalLink, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import MainLayout from '@/components/MainLayout';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
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

  useEffect(() => {
    if (id) {
      loadLectureData();
      loadClasses();
    }
  }, [id]);

  const loadLectureData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setLecture(data);
      setLectureTitle(data.title || 'Nova Aula');

      if (data.structured_content) {
        setStructuredContent(data.structured_content as StructuredContent);
      } else if (data.status === 'processing') {
        // Trigger AI processing
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
          transcript,
          topic: lectureTitle 
        }
      });

      if (error) throw error;

      if (data?.structuredContent) {
        setStructuredContent(data.structuredContent);
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

      const { error } = await supabase
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
        {/* Background effect */}
        <div className="absolute inset-0 z-0">
          <BackgroundRippleEffect className="opacity-30" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Centro de Publicação Inteligente
              </h1>
              <p className="text-slate-400">
                Revise e publique seu material didático gerado por IA
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
                {lecture?.status === 'ready' && 'Pronto'}
                {lecture?.status === 'published' && 'Publicado'}
              </Badge>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left column - Generated content */}
              <div className="lg:col-span-2 space-y-6">
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
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-400" />
                      Resumo da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300 leading-relaxed">
                      {structuredContent.resumo}
                    </p>
                  </CardContent>
                </Card>

                {/* Main topics */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-400" />
                      Tópicos Principais
                    </CardTitle>
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
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-purple-400" />
                      Referências Externas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {structuredContent.referencias_externas.map((ref, index) => (
                        <a
                          key={index}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 text-purple-400 mt-1 shrink-0" />
                          <div>
                            <p className="text-white font-medium">{ref.titulo}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
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
                  <CardHeader>
                    <CardTitle className="text-white">
                      Perguntas de Revisão ({structuredContent.perguntas_revisao.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-6">
                        {structuredContent.perguntas_revisao.map((pergunta, index) => (
                          <div key={index} className="bg-slate-900/50 rounded-lg p-4">
                            <p className="text-white font-medium mb-3">
                              {index + 1}. {pergunta.pergunta}
                            </p>
                            <div className="space-y-2">
                              {pergunta.opcoes.map((opcao, opIndex) => (
                                <div
                                  key={opIndex}
                                  className={`p-2 rounded ${
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
                  <CardHeader>
                    <CardTitle className="text-white">
                      Flashcards ({structuredContent.flashcards.length})
                    </CardTitle>
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

              {/* Right column - Publication settings */}
              <div className="space-y-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Publicar Aula</CardTitle>
                    <CardDescription className="text-slate-400">
                      Selecione a turma e publique o material
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="class-select" className="text-white">
                        Selecionar Turma
                      </Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                          <SelectValue placeholder="Escolha uma turma" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} - {cls.course}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handlePublish}
                      disabled={!selectedClassId || isPublishing}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Publicando...
                        </>
                      ) : (
                        'Publicar Aula'
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Stats card */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">
                      Estatísticas do Material
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Tópicos</span>
                      <span className="text-white font-semibold">
                        {structuredContent.topicos_principais.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Perguntas</span>
                      <span className="text-white font-semibold">
                        {structuredContent.perguntas_revisao.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Flashcards</span>
                      <span className="text-white font-semibold">
                        {structuredContent.flashcards.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Referências</span>
                      <span className="text-white font-semibold">
                        {structuredContent.referencias_externas.length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default LectureTranscriptionPage;