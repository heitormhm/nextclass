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
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MedicalConductModal } from '@/components/MedicalConductModal';

// Mock diagnoses database
const mockDiagnoses = [
  'I10 - Hipertensão essencial',
  'E11 - Diabetes mellitus não insulino-dependente', 
  'J45 - Asma',
  'J06 - Infecções agudas das vias aéreas superiores',
  'I20 - Angina pectoris',
  'I21 - Infarto agudo do miocárdio',
  'I25 - Doença isquêmica crônica do coração',
  'N18 - Doença renal crônica'
];

const ConsultationReviewPage = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('anamnese');
  const [consultationType, setConsultationType] = useState('primeira-consulta');
  const [documentType, setDocumentType] = useState('');
  const [showMedicalConductModal, setShowMedicalConductModal] = useState(false);
  const [medicalConductAdded, setMedicalConductAdded] = useState(false);
  
  // Diagnostic hypothesis state
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<string[]>([]);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  
  const [anamneseContent, setAnamneseContent] = useState(`
<div class="space-y-6">
<div>
<h3 class="font-semibold text-gray-800 mb-2">IDENTIFICAÇÃO</h3>
<p class="text-gray-700">Maria Silva, 45 anos, feminino, brasileira, casada, professora, natural e procedente de São Paulo/SP.</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">QUEIXA PRINCIPAL (QP)</h3>
<p class="text-gray-700">"Dor no peito e falta de ar há 3 dias"</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">HISTÓRIA DA MOLÉSTIA ATUAL (HMA)</h3>
<p class="text-gray-700">Paciente refere início de dor precordial há 3 dias, de caráter opressivo, com irradiação para membro superior esquerdo, associada a dispneia aos pequenos esforços. Nega palpitações, síncope ou edema de membros inferiores. Procurou atendimento médico devido à intensificação dos sintomas.</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">ANTECEDENTES PESSOAIS</h3>
<p class="text-gray-700">HAS há 10 anos, em uso de Losartana 50mg/dia. Nega DM, dislipidemia ou cardiopatia prévia. Não tabagista, etilismo social. Sedentária.</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">ANTECEDENTES FAMILIARES</h3>
<p class="text-gray-700">Pai com IAM aos 60 anos. Mãe hipertensa. Nega outros antecedentes cardiovasculares familiares relevantes.</p>
</div>

<div>
<h3 class="font-semibold text-gray-800 mb-2">EXAME FÍSICO</h3>
<p class="text-gray-700">REG, corada, hidratada, anictérica. PA: 160x100mmHg, FC: 88bpm, FR: 20irpm. ACV: RCR 2T BNF, sem sopros. AR: MVF sem RA. Abdome: plano, RHA+, indolor. MMII: sem edema.</p>
</div>
</div>
  `);

  const [transcriptionContent] = useState(`
<div class="space-y-4">
<div class="p-4 bg-gray-50 rounded-lg">
<p class="text-sm text-gray-600 mb-2"><strong>Médico:</strong> Boa tarde, senhora Maria. Como posso ajudá-la hoje?</p>
</div>
<div class="p-4 bg-blue-50 rounded-lg">
<p class="text-sm text-gray-600 mb-2"><strong>Paciente:</strong> Doutor, estou com uma dor no peito há uns três dias que não passa. Também estou sentindo falta de ar.</p>
</div>
<div class="p-4 bg-gray-50 rounded-lg">
<p class="text-sm text-gray-600 mb-2"><strong>Médico:</strong> Entendo. Pode me descrever melhor essa dor? Onde exatamente sente?</p>
</div>
<div class="p-4 bg-blue-50 rounded-lg">
<p class="text-sm text-gray-600 mb-2"><strong>Paciente:</strong> É bem aqui no meio do peito, doutor. Às vezes irradia para o braço esquerdo. É como se fosse um peso.</p>
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

  const handleMedicalConduct = () => {
    if (medicalConductAdded) {
      handleSave();
    } else {
      setShowMedicalConductModal(true);
    }
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
    toast.info(isEditing ? "Modo de visualização ativado" : "Modo de edição ativado");
  };

  // Diagnostic hypothesis functions
  const handleDiagnosisInputChange = (value: string) => {
    setDiagnosisInput(value);
    if (value.length > 1) {
      const suggestions = mockDiagnoses.filter(diagnosis =>
        diagnosis.toLowerCase().includes(value.toLowerCase())
      );
      setDiagnosisSuggestions(suggestions);
    } else {
      setDiagnosisSuggestions([]);
    }
  };

  const addDiagnosis = (diagnosis: string) => {
    if (!selectedDiagnoses.includes(diagnosis)) {
      setSelectedDiagnoses([...selectedDiagnoses, diagnosis]);
    }
    setDiagnosisInput('');
    setDiagnosisSuggestions([]);
  };

  const removeDiagnosis = (diagnosis: string) => {
    setSelectedDiagnoses(selectedDiagnoses.filter(d => d !== diagnosis));
  };

  const handleMedicalConductSave = (data: any) => {
    // Format the medical conduct data and append to anamnesis
    let conductSection = '\n\n<div>\n<h3 class="font-semibold text-gray-800 mb-2">CONDUTA MÉDICA</h3>\n';
    
    if (data.exams.length > 0) {
      conductSection += '<div class="mb-4">\n<h4 class="font-medium text-gray-800 mb-1">Exames solicitados:</h4>\n<ul class="text-gray-700 ml-4 list-disc">\n';
      data.exams.forEach((exam: string) => {
        conductSection += `<li>${exam}</li>\n`;
      });
      conductSection += '</ul>\n</div>\n';
    }

    if (data.medications.length > 0) {
      conductSection += '<div class="mb-4">\n<h4 class="font-medium text-gray-800 mb-1">Medicações prescritas:</h4>\n<ul class="text-gray-700 ml-4 list-disc">\n';
      data.medications.forEach((med: any) => {
        const medText = med.dosage ? `${med.name} - ${med.dosage}` : med.name;
        conductSection += `<li>${medText}</li>\n`;
      });
      conductSection += '</ul>\n</div>\n';
    }

    if (data.orientations) {
      conductSection += `<div class="mb-4">\n<h4 class="font-medium text-gray-800 mb-1">Orientações ao paciente:</h4>\n<p class="text-gray-700">${data.orientations}</p>\n</div>\n`;
    }

    conductSection += '</div>';
    
    setAnamneseContent(prev => prev + conductSection);
    setShowMedicalConductModal(false);
    setMedicalConductAdded(true);
    toast.success("Conduta médica adicionada ao documento!");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Information & Actions Panel */}
          <div className="lg:col-span-4 space-y-6">
            {/* Consultation Info Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>Informações da Consulta</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Queixa Principal</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    "Dor no peito e falta de ar há 3 dias"
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Data da Consulta</p>
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
                      <SelectItem value="exame-laboratorial">Exame Laboratorial</SelectItem>
                      <SelectItem value="exame-imagem">Exame de Imagem</SelectItem>
                      <SelectItem value="receita-medica">Receita Médica</SelectItem>
                      <SelectItem value="atestado">Atestado Médico</SelectItem>
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
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <span>Próximos Passos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Hipótese Diagnóstica
                  </label>
                  <div className="relative">
                    <Input
                      value={diagnosisInput}
                      onChange={(e) => handleDiagnosisInputChange(e.target.value)}
                      placeholder="Digite para buscar diagnósticos (CID-10/11)..."
                      className="mb-2"
                    />
                    
                    {diagnosisSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {diagnosisSuggestions.map((diagnosis, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                            onClick={() => addDiagnosis(diagnosis)}
                          >
                            {diagnosis}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDiagnoses.map((diagnosis, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {diagnosis}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeDiagnosis(diagnosis)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Medical Document Editor */}
          <div className="lg:col-span-8">
            <Card className="border-0 shadow-sm relative">
              {/* Header with Patient Info */}
              <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground">Paciente</p>
                      <p className="text-foreground-muted">Maria Silva</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Idade</p>
                      <p className="text-foreground-muted">45 anos</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Gênero</p>
                      <p className="text-foreground-muted">Feminino</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">CPF</p>
                      <p className="text-foreground-muted">***.***.***-**</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Histórico</p>
                      <p className="text-foreground-muted">HAS</p>
                    </div>
                  </div>
                  
                  <div className="min-w-[180px]">
                    <Select value={consultationType} onValueChange={setConsultationType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="primeira-consulta">Primeira Consulta</SelectItem>
                        <SelectItem value="retorno">Retorno</SelectItem>
                        <SelectItem value="urgencia">Urgência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              {/* Tabs */}
              <CardContent className="px-6 pb-20">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="anamnese">Anamnese Médica</TabsTrigger>
                    <TabsTrigger value="transcricao">Transcrição da Consulta</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="anamnese" className="mt-6">
                    <div
                      contentEditable={isEditing}
                      dangerouslySetInnerHTML={{ __html: anamneseContent }}
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
                          setAnamneseContent(e.currentTarget.innerHTML);
                        }
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="transcricao" className="mt-6">
                    <div
                      dangerouslySetInnerHTML={{ __html: transcriptionContent }}
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
                    onClick={handleMedicalConduct}
                    className="bg-primary hover:bg-primary/90 flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{medicalConductAdded ? 'Salvar Documento' : 'Conduta Médica'}</span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <MedicalConductModal
        open={showMedicalConductModal}
        onClose={() => setShowMedicalConductModal(false)}
        onSave={handleMedicalConductSave}
      />
    </div>
  );
};

export default ConsultationReviewPage;