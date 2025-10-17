import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Download, 
  Edit3, 
  Calendar,
  MapPin,
  Briefcase,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPDF } from '@/utils/pdfGenerator';

const InternshipReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('report');
  const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!id) {
        setError('ID da sessão não fornecido');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('internship_sessions')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (!data) {
          setError('Sessão não encontrada');
        } else {
          setSession(data);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        setError('Erro ao carregar sessão');
        toast.error('Erro ao carregar sessão');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  const formatReportContent = (aiSummary: any) => {
    if (!aiSummary) {
      return '<p class="text-gray-500 text-center py-8">Resumo em processamento...</p>';
    }

    return `
      <div class="space-y-6">
        ${aiSummary.chiefComplaint ? `
          <div>
            <h3 class="font-semibold text-gray-800 mb-2">ESCOPO PRINCIPAL</h3>
            <ul class="list-disc pl-5 space-y-1">
              ${aiSummary.chiefComplaint.map((item: string) => `<li class="text-gray-700">${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${aiSummary.historyOfPresentIllness ? `
          <div>
            <h3 class="font-semibold text-gray-800 mb-2">DESCRIÇÃO TÉCNICA</h3>
            <ul class="list-disc pl-5 space-y-1">
              ${aiSummary.historyOfPresentIllness.map((item: string) => `<li class="text-gray-700">${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${aiSummary.physicalExamination ? `
          <div>
            <h3 class="font-semibold text-gray-800 mb-2">OBSERVAÇÕES TÉCNICAS</h3>
            <ul class="list-disc pl-5 space-y-1">
              ${aiSummary.physicalExamination.map((item: string) => `<li class="text-gray-700">${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${aiSummary.assessmentAndPlan ? `
          <div>
            <h3 class="font-semibold text-gray-800 mb-2">ANÁLISE E RECOMENDAÇÕES</h3>
            <ul class="list-disc pl-5 space-y-1">
              ${aiSummary.assessmentAndPlan.map((item: string) => `<li class="text-gray-700">${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  };

  const formatTranscriptionContent = (transcript: any[]) => {
    if (!transcript || transcript.length === 0) {
      return '<p class="text-gray-500 text-center py-8">Transcrição não disponível</p>';
    }

    return `
      <div class="space-y-4">
        ${transcript.map((entry: any) => `
          <div class="p-4 ${entry.speaker === 'Supervisor' ? 'bg-gray-50' : 'bg-blue-50'} rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-medium text-gray-600">${entry.speaker}</span>
              <span class="text-xs text-gray-400">${entry.timestamp}</span>
            </div>
            <p class="text-sm text-gray-700">${entry.text}</p>
          </div>
        `).join('')}
      </div>
    `;
  };

  const scenarioData = session ? {
    id: session.id,
    internshipType: session.internship_type,
    location: session.location_name,
    date: new Date(session.created_at).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    case: session.ai_summary?.title || session.internship_type,
    tags: session.tags || [],
    reportContent: formatReportContent(session.ai_summary),
    transcriptionContent: formatTranscriptionContent(session.transcript)
  } : null;

  const handleExport = async () => {
    if (!scenarioData) return;
    
    setIsExportingPDF(true);
    
    try {
      // Convert HTML to clean text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = scenarioData.reportContent;
      const cleanContent = tempDiv.textContent || '';
      
      // Generate PDF
      const result = await generateReportPDF({
        content: cleanContent,
        title: scenarioData.case
      });
      
      if (result.success) {
        toast.success('PDF exportado com sucesso!');
      } else {
        throw new Error(result.error || 'Erro ao gerar PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleEdit = async () => {
    if (!scenarioData || !session) return;
    
    setIsCreatingAnnotation(true);
    
    try {
      // Get the current user session
      const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !authSession) {
        toast.error('Você precisa estar autenticado para criar anotações');
        setIsCreatingAnnotation(false);
        return;
      }

      // Add date to annotation title
      const formattedDate = new Date(session.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const annotationTitle = `${scenarioData.internshipType} - ${scenarioData.location} (${formattedDate})`;
      const annotationContent = scenarioData.reportContent;
      
      // Buscar tags do cenário para incluir na anotação
      const tagsToInclude = scenarioData.tags || [];

      // Create annotation directly in the database
      const { data, error } = await supabase
        .from('annotations')
        .insert([{
          user_id: authSession.user.id,
          title: annotationTitle,
          content: annotationContent,
          source_type: 'internship_report',
          source_id: id,
          tags: tagsToInclude,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating annotation:', error);
        toast.error('Erro ao criar anotação. Tente novamente.');
        setIsCreatingAnnotation(false);
        return;
      }

      if (data?.id) {
        toast.success('Anotação criada com sucesso!');
        navigate(`/annotation/${data.id}`);
      } else {
        toast.error('Erro ao criar anotação. Tente novamente.');
        setIsCreatingAnnotation(false);
      }
    } catch (error) {
      console.error('Unexpected error creating annotation:', error);
      toast.error('Erro inesperado. Tente novamente.');
      setIsCreatingAnnotation(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Carregando sessão...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !session || !scenarioData) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {error || 'Sessão não encontrada'}
              </h3>
              <Button onClick={() => navigate('/internship')} className="mt-4">
                Voltar para o Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Back Button */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/internship')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Relatório do Cenário</h1>
                <p className="text-sm text-foreground-muted">{scenarioData.case}</p>
              </div>
            </div>

            {/* Context Information Card */}
            <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Informações do Cenário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Estágio</p>
                      <p className="text-sm text-foreground-muted mt-1">
                        {scenarioData.internshipType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Local/Contexto</p>
                      <p className="text-sm text-foreground-muted mt-1">
                        {scenarioData.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Data da Gravação</p>
                      <p className="text-sm text-foreground-muted mt-1">
                        {scenarioData.date}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Report Card */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Análise Técnica</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    Gerado por IA
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="border-b px-6">
                    <TabsList className="bg-transparent border-0 w-full justify-start">
                      <TabsTrigger 
                        value="report"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                      >
                        Relatório do Projeto
                      </TabsTrigger>
                      <TabsTrigger 
                        value="transcription"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                      >
                        Transcrição da Análise
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="report" className="mt-0">
                    <div
                      dangerouslySetInnerHTML={{ __html: scenarioData.reportContent }}
                      className="min-h-[600px] p-6 prose prose-gray max-w-none
                        [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mb-2
                        [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4"
                    />
                  </TabsContent>
                  
                  <TabsContent value="transcription" className="mt-0">
                    <div
                      dangerouslySetInnerHTML={{ __html: scenarioData.transcriptionContent }}
                      className="min-h-[600px] p-6 prose prose-gray max-w-none"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Action Bar */}
            <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleEdit}
                    disabled={isCreatingAnnotation}
                    className="gap-2"
                  >
                    {isCreatingAnnotation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando Anotação...
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4" />
                        Criar Anotação
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={isExportingPDF}
                    className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  >
                    {isExportingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Exportar como PDF
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default InternshipReviewPage;
