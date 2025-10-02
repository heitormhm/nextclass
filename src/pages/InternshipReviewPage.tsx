import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Download, 
  Edit3, 
  Calendar,
  MapPin,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import { toast } from 'sonner';

const InternshipReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('report');

  // Mock data - in real app, fetch from database using the id
  const scenarioData = {
    id: id,
    internshipType: 'Estágio em Engenharia Civil',
    location: 'Construtora Alfa - Setor de Estruturas',
    date: '15 de Março de 2024',
    case: 'Análise de tensão em viga metálica',
    reportContent: `
<div class="space-y-6">
  <div>
    <h3 class="font-semibold text-gray-800 mb-2">IDENTIFICAÇÃO DO PROJETO</h3>
    <p class="text-gray-700">Análise estrutural de viga metálica I-400, aplicada em ponte rodoviária, comprimento 12m, localizada em São Paulo/SP, projeto iniciado em março/2024.</p>
  </div>

  <div>
    <h3 class="font-semibold text-gray-800 mb-2">ESCOPO PRINCIPAL (EP)</h3>
    <p class="text-gray-700">"Verificação de tensões máximas e deflexão em viga sob carregamento distribuído"</p>
  </div>

  <div>
    <h3 class="font-semibold text-gray-800 mb-2">DESCRIÇÃO TÉCNICA ATUAL (DTA)</h3>
    <p class="text-gray-700">Estrutura apresentou tensões críticas no ponto central (280 MPa), próximo ao limite de escoamento do aço ASTM A572 (345 MPa). Verificação de deflexão L/350 atendida (34mm medido vs. 34.3mm limite). Solicitado estudo complementar de fadiga para ciclos de carga móvel. Cargas consideradas: peso próprio (8 kN/m), sobrecarga de tráfego (25 kN/m), fator de impacto 1.4.</p>
  </div>

  <div>
    <h3 class="font-semibold text-gray-800 mb-2">PARÂMETROS ANTERIORES</h3>
    <p class="text-gray-700">Estrutura similar executada em 2022, vão de 10m, sem problemas estruturais. Material: aço ASTM A572 Gr50. Não houve falhas de fadiga em 2 anos de operação. Projeto executivo aprovado pelos órgãos competentes (CREA-SP).</p>
  </div>

  <div>
    <h3 class="font-semibold text-gray-800 mb-2">REFERÊNCIAS TÉCNICAS</h3>
    <p class="text-gray-700">NBR 8800 (estruturas de aço e mistas), NBR 7188 (cargas móveis em pontes), NBR 6118 (complementar para apoios em concreto). Consultoria estrutural especializada em pontes rodoviárias disponível.</p>
  </div>

  <div>
    <h3 class="font-semibold text-gray-800 mb-2">ANÁLISE TÉCNICA INICIAL</h3>
    <p class="text-gray-700">Estrutura apresenta-se adequada aos carregamentos previstos com margem de segurança de 23%. Tensões dentro dos limites admissíveis considerando coeficientes de segurança. Deflexão L/350 atendida com folga mínima. Recomenda-se análise dinâmica complementar para verificação de vibrações induzidas por tráfego e análise de fadiga para categoria de detalhe adequada às soldas.</p>
  </div>
</div>
    `,
    transcriptionContent: `
<div class="space-y-4">
  <div class="p-4 bg-gray-50 rounded-lg">
    <p class="text-sm text-gray-600 mb-2"><strong>Engenheiro:</strong> Boa tarde. Vamos analisar os parâmetros estruturais desta viga?</p>
  </div>
  <div class="p-4 bg-blue-50 rounded-lg">
    <p class="text-sm text-gray-600 mb-2"><strong>Estagiário:</strong> Sim, identifiquei tensões de 280 MPa no centro do vão. A deflexão está em 34mm, dentro do limite de L/350.</p>
  </div>
  <div class="p-4 bg-gray-50 rounded-lg">
    <p class="text-sm text-gray-600 mb-2"><strong>Engenheiro:</strong> Entendo. E qual é o material especificado?</p>
  </div>
  <div class="p-4 bg-blue-50 rounded-lg">
    <p class="text-sm text-gray-600 mb-2"><strong>Estagiário:</strong> Aço ASTM A572 Gr50, com tensão de escoamento de 345 MPa. Estamos com uma margem de segurança de 23%.</p>
  </div>
  <div class="p-4 bg-gray-50 rounded-lg">
    <p class="text-sm text-gray-600 mb-2"><strong>Engenheiro:</strong> Ótimo trabalho. Precisamos fazer uma análise de fadiga complementar, considerando os ciclos de carga móvel. Você pode preparar isso?</p>
  </div>
  <div class="p-4 bg-blue-50 rounded-lg">
    <p class="text-sm text-gray-600 mb-2"><strong>Estagiário:</strong> Sim, vou usar a NBR 8800 como referência e considerar a categoria de detalhe adequada para as soldas.</p>
  </div>
</div>
    `
  };

  const handleExport = () => {
    toast.success('Relatório exportado com sucesso!');
  };

  const handleEdit = () => {
    toast.info('Funcionalidade de edição em desenvolvimento');
  };

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
                    className="gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar Relatório
                  </Button>
                  <Button
                    onClick={handleExport}
                    className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  >
                    <Download className="h-4 w-4" />
                    Exportar como PDF
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
