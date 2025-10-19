import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  ScanLine, 
  Edit3, 
  Save,
  Calendar,
  User,
  FileText,
  ChevronDown,
  Stethoscope,
  X,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/utils/sanitize';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EngineeringConductModal } from '@/components/EngineeringConductModal';

// Mock engineering analysis database
const mockAnalysis = [
  'A10 - Análise de tensão estrutural',
  'E11 - Cálculo de eficiência energética', 
  'C45 - Análise de circuitos elétricos',
  'F06 - Estudo de fluxo de fluidos',
  'T20 - Análise termodinâmica',
  'M21 - Ensaio de materiais',
  'S25 - Simulação computacional (FEA)',
  'R18 - Análise de resistência mecânica',
  'D30 - Dimensionamento de fundações',
  'V12 - Análise de vibrações'
];

const ProjectReviewPage = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('projeto');
  const [projectType, setProjectType] = useState('projeto-inicial');
  const [documentType, setDocumentType] = useState('');
  const [showEngineeringConductModal, setShowEngineeringConductModal] = useState(false);
  const [engineeringConductAdded, setEngineeringConductAdded] = useState(false);
  
  // Analysis hypothesis state
  const [analysisInput, setAnalysisInput] = useState('');
  const [analysisSuggestions, setAnalysisSuggestions] = useState<string[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string[]>([]);
  
  const [projectContent, setProjectContent] = useState(`
<div class="space-y-6">
<div>
<h3 class="font-semibold text-gray-800 mb-2">IDENTIFICAÇÃO DO PROJETO</h3>
<p class="text-gray-700">Ponte Rodoviária Rio Grande, 45m de vão, estrutura mista (aço-concreto), localizada em São Paulo/SP, projeto iniciado em março/2025.</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">ESCOPO PRINCIPAL (EP)</h3>
<p class="text-gray-700">"Análise de estabilidade estrutural e dimensionamento de vigas"</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">DESCRIÇÃO TÉCNICA ATUAL (DTA)</h3>
<p class="text-gray-700">Projeto apresenta necessidade de análise de tensões críticas nas vigas principais, com verificação de deflexão máxima permitida. Cargas consideradas: peso próprio, sobrecarga rodoviária e ações do vento. Solicitado estudo de fadiga para vida útil de 50 anos.</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">PARÂMETROS ANTERIORES</h3>
<p class="text-gray-700">Estrutura similar executada em 2020, vão de 35m, sem problemas estruturais. Materiais: aço ASTM A572 Gr50, concreto C30. Não houve falhas de fadiga. Projeto executivo aprovado pelos órgãos competentes.</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">REFERÊNCIAS TÉCNICAS</h3>
<p class="text-gray-700">NBR 8800 (estruturas de aço), NBR 6118 (estruturas de concreto), NBR 7188 (cargas móveis). Consultoria estrutural especializada em pontes rodoviárias disponível.</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">ANÁLISE TÉCNICA INICIAL</h3>
<p class="text-gray-700">Estrutura apresenta-se adequada aos carregamentos previstos. Tensões dentro dos limites admissíveis. Deflexão L/300 atendida. Recomenda-se análise dinâmica complementar para verificação de vibrações.</p>
</div>
</div>
  `);

  const [transcriptionContent] = useState(`
<div class="space-y-4">
<div class="p-4 bg-gray-50 rounded-lg">
<p class="text-sm text-gray-600 mb-2"><strong>Engenheiro:</strong> Boa tarde. Vamos analisar os parâmetros estruturais deste projeto?</p>
</div>
<div class="p-4 bg-blue-50 rounded-lg">
<p class="text-sm text-gray-600 mb-2"><strong>Técnico:</strong> Sim, identificamos algumas tensões elevadas nas vigas principais. As deflexões também estão próximas do limite.</p>
</div>
<div class="p-4 bg-gray-50 rounded-lg">
<p class="text-sm text-gray-600 mb-2"><strong>Engenheiro:</strong> Entendo. Você pode me mostrar os valores específicos? Onde exatamente estão as maiores tensões?</p>
</div>
<div class="p-4 bg-blue-50 rounded-lg">
<p class="text-sm text-gray-600 mb-2"><strong>Técnico:</strong> Principalmente no meio do vão, próximo aos pontos de aplicação das cargas móveis. A tensão está em 280 MPa.</p>
</div>
</div>
  `);

  const handleAttachFile = () => {
    toast.info("Funcionalidade de anexar arquivo em desenvolvimento");
  };

  const handleScanOCR = () => {
    toast.info("Funcionalidade de OCR em desenvolvimento");
  };

  const handleExport = () => {
    toast.success("Documento exportado com sucesso!");
  };

  const handleSave = () => {
    toast.success("Documento salvo com sucesso!");
    navigate('/internship');
  };

  const handleEngineeringConduct = () => {
    if (engineeringConductAdded) {
      handleSave();
    } else {
      setShowEngineeringConductModal(true);
    }
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
    toast.info(isEditing ? "Modo de visualização ativado" : "Modo de edição ativado");
  };

  // Analysis hypothesis functions
  const handleAnalysisInputChange = (value: string) => {
    setAnalysisInput(value);
    if (value.length > 1) {
      const suggestions = mockAnalysis.filter(analysis =>
        analysis.toLowerCase().includes(value.toLowerCase())
      );
      setAnalysisSuggestions(suggestions);
    } else {
      setAnalysisSuggestions([]);
    }
  };

  const addAnalysis = (analysis: string) => {
    if (!selectedAnalysis.includes(analysis)) {
      setSelectedAnalysis([...selectedAnalysis, analysis]);
    }
    setAnalysisInput('');
    setAnalysisSuggestions([]);
  };

  const removeAnalysis = (analysis: string) => {
    setSelectedAnalysis(selectedAnalysis.filter(d => d !== analysis));
  };

  const handleEngineeringConductSave = (data: any) => {
    // Format the engineering conduct data and append to project report
    let conductSection = '\n\n<div>\n<h3 class="font-semibold text-gray-800 mb-2">RECOMENDAÇÕES TÉCNICAS</h3>\n';
    
    if (data.exams.length > 0) {
      conductSection += '<div class="mb-4">\n<h4 class="font-medium text-gray-800 mb-1">Análises complementares:</h4>\n<ul class="text-gray-700 ml-4 list-disc">\n';
      data.exams.forEach((exam: string) => {
        conductSection += `<li>${exam}</li>\n`;
      });
      conductSection += '</ul>\n</div>\n';
    }

    if (data.medications.length > 0) {
      conductSection += '<div class="mb-4">\n<h4 class="font-medium text-gray-800 mb-1">Intervenções recomendadas:</h4>\n<ul class="text-gray-700 ml-4 list-disc">\n';
      data.medications.forEach((med: any) => {
        const medText = med.dosage ? `${med.name} - ${med.dosage}` : med.name;
        conductSection += `<li>${medText}</li>\n`;
      });
      conductSection += '</ul>\n</div>\n';
    }

    if (data.orientations) {
      conductSection += `<div class="mb-4">\n<h4 class="font-medium text-gray-800 mb-1">Observações gerais:</h4>\n<p class="text-gray-700">${data.orientations}</p>\n</div>\n`;
    }

    conductSection += '</div>';
    
    setProjectContent(prev => prev + conductSection);
    setShowEngineeringConductModal(false);
    setEngineeringConductAdded(true);
    toast.success("Recomendações técnicas adicionadas ao documento!");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Information & Actions Panel */}
          <div className="lg:col-span-4 space-y-6">
            {/* Session Info Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>Informações da Sessão</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Problema Principal</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    "Tensões elevadas em vigas estruturais"
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Data da Sessão</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    15 de março de 2024, 14:30
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Duração</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    25 minutos
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Status</p>
                  <Badge variant="secondary" className="mt-1">
                    Finalizada
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Add More Information Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Acrescentar Mais Informações</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Tipo de Documento
                  </label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar tipo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="relatorio-tecnico">Relatório Técnico</SelectItem>
                      <SelectItem value="calculo-estrutural">Cálculo Estrutural</SelectItem>
                      <SelectItem value="memorial-descritivo">Memorial Descritivo</SelectItem>
                      <SelectItem value="laudo-tecnico">Laudo Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleAttachFile}
                    className="justify-start"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Anexar Foto/Documento
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleScanOCR}
                    className="justify-start"
                  >
                    <ScanLine className="h-4 w-4 mr-2" />
                    Escanear e OCR
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Próximos Passos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Análises Complementares
                  </label>
                  <div className="relative">
                    <Input
                      value={analysisInput}
                      onChange={(e) => handleAnalysisInputChange(e.target.value)}
                      placeholder="Digite para buscar análises técnicas..."
                      className="mb-2"
                    />
                    
                    {analysisSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {analysisSuggestions.map((analysis, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                            onClick={() => addAnalysis(analysis)}
                          >
                            {analysis}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedAnalysis.map((analysis, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {analysis}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeAnalysis(analysis)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Technical Document Editor */}
          <div className="lg:col-span-8">
            <Card className="border-0 shadow-sm relative">
              {/* Header with Project Info */}
              <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground">Projeto</p>
                      <p className="text-foreground-muted">Ponte Rio Grande</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Vão</p>
                      <p className="text-foreground-muted">45 metros</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Tipo</p>
                      <p className="text-foreground-muted">Estrutura Mista</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Localização</p>
                      <p className="text-foreground-muted">São Paulo/SP</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Histórico</p>
                      <p className="text-foreground-muted">Em análise</p>
                    </div>
                  </div>
                  
                  <div className="min-w-[180px]">
                    <Select value={projectType} onValueChange={setProjectType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="projeto-inicial">Projeto Inicial</SelectItem>
                        <SelectItem value="revisao">Revisão</SelectItem>
                        <SelectItem value="urgencia">Análise Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              {/* Tabs */}
              <CardContent className="px-6 pb-20">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted rounded-md">
                    <TabsTrigger value="projeto" className="data-[state=active]:bg-background">Relatório do Projeto</TabsTrigger>
                    <TabsTrigger value="transcricao" className="data-[state=active]:bg-background">Transcrição da Análise</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="projeto" className="mt-6">
                    <div
                      contentEditable={isEditing}
                      dangerouslySetInnerHTML={{ __html: sanitizeHTML(projectContent) }}
                      className={cn(
                        "min-h-[600px] p-6 rounded-lg border",
                        isEditing 
                          ? "border-primary/30 bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                          : "border-gray-200 bg-gray-50/30",
                        "prose prose-gray max-w-none",
                        "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mb-2",
                        "[&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4"
                      )}
                      onInput={(e) => {
                        if (isEditing) {
                          setProjectContent(e.currentTarget.innerHTML);
                        }
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="transcricao" className="mt-6">
                    <div
                      dangerouslySetInnerHTML={{ __html: sanitizeHTML(transcriptionContent) }}
                      className={cn(
                        "min-h-[600px] p-6 rounded-lg border border-gray-200 bg-gray-50/30",
                        "prose prose-gray max-w-none"
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>

              {/* Floating Export Button */}
              <Button
                onClick={handleExport}
                className="fixed bottom-6 right-6 lg:absolute lg:bottom-24 lg:right-6 rounded-full h-12 w-12 p-0 shadow-lg bg-primary hover:bg-primary/90 z-10"
                title="Exportar documento"
              >
                <Download className="h-5 w-5" />
              </Button>

              {/* Footer Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleEdit}
                    className="flex items-center space-x-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>{isEditing ? 'Parar Edição' : 'Editar Documento'}</span>
                  </Button>
                  
                  <Button
                    onClick={handleEngineeringConduct}
                    className="bg-primary hover:bg-primary/90 flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{engineeringConductAdded ? 'Salvar Documento' : 'Conduta de Engenharia'}</span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <EngineeringConductModal
        open={showEngineeringConductModal}
        onClose={() => setShowEngineeringConductModal(false)}
        onSave={handleEngineeringConductSave}
      />
    </div>
  );
};

export default ProjectReviewPage;