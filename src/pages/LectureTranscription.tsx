import React, { useState } from 'react';
import { Upload, FileText, Image, Video, AudioLines, Clock, User, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogClose 
} from '@/components/ui/dialog';
import MainLayout from '@/components/MainLayout';

const LectureTranscription = () => {
  const [lectureTitle, setLectureTitle] = useState('Fisiologia Cardiovascular - Ciclo Cardíaco');
  const [lectureStatus, setLectureStatus] = useState<'draft' | 'review' | 'published'>('draft');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, name: string, type: string}>>([]);

  const rawTranscript = `[00:00:15] Professor: Bom dia, turma. Hoje vamos abordar um dos temas mais fundamentais da cardiologia: o ciclo cardíaco.

[00:00:28] Professor: O ciclo cardíaco compreende todos os eventos que ocorrem desde o início de um batimento cardíaco até o início do próximo batimento.

[00:00:45] Professor: Podemos dividir o ciclo cardíaco em duas fases principais: a sístole e a diástole.

[00:01:02] Professor: Durante a sístole, que dura aproximadamente 0,3 segundos em repouso, os ventrículos se contraem e ejetam o sangue.

[00:01:18] Professor: Já na diástole, que dura cerca de 0,5 segundos, os ventrículos relaxam e se enchem de sangue.

[00:01:35] Professor: É importante entender que essas durações podem variar conforme a frequência cardíaca do indivíduo.`;

  const structuredContent = `# Fisiologia Cardiovascular - Ciclo Cardíaco

## Introdução
O ciclo cardíaco é um processo fundamental que garante a circulação sanguínea contínua no organismo.

## Definição
O ciclo cardíaco compreende todos os eventos que ocorrem desde o início de um batimento cardíaco até o início do próximo batimento.

## Fases do Ciclo Cardíaco

### 1. Sístole
- **Duração:** Aproximadamente 0,3 segundos (em repouso)
- **Processo:** Contração ventricular
- **Função:** Ejeção do sangue dos ventrículos

### 2. Diástole  
- **Duração:** Aproximadamente 0,5 segundos (em repouso)
- **Processo:** Relaxamento ventricular
- **Função:** Enchimento ventricular com sangue

## Considerações Importantes
- As durações das fases variam conforme a frequência cardíaca
- O ciclo total dura aproximadamente 0,8 segundos em repouso
- A frequência cardíaca normal varia entre 60-100 bpm

## Pontos-Chave para Memorização
1. Sístole = Contração = Ejeção
2. Diástole = Relaxamento = Enchimento
3. Duração total ≈ 0,8s (repouso)`;

  const aiSummary = `Esta aula abordou os conceitos fundamentais do ciclo cardíaco, focando na distinção entre sístole e diástole. Os principais pontos discutidos incluem:

• Definição completa do ciclo cardíaco
• Duração e características da sístole (0,3s - contração/ejeção)
• Duração e características da diástole (0,5s - relaxamento/enchimento)
• Variabilidade temporal baseada na frequência cardíaca

Recomendação: Adicionar material visual (ECG, ecocardiograma) para melhor compreensão dos conceitos.`;

  const handleFileUpload = (type: string) => {
    // Simulate file upload
    const newFile = {
      id: Date.now().toString(),
      name: `material_${type}_${Date.now()}.${type === 'pdf' ? 'pdf' : type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'mp3'}`,
      type
    };
    setUploadedFiles(prev => [...prev, newFile]);
  };

  const handlePublish = () => {
    setLectureStatus('published');
    // Here you would typically save to backend and redirect
    alert('Aula publicada com sucesso!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'published': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'review': return 'Em Revisão';
      case 'published': return 'Publicado';
      default: return 'Desconhecido';
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header - Mobile optimized */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-8 mb-6 sm:mb-8">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                Revisão e Publicação
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-white/80">
                Revise o conteúdo transcrito e publique sua aula
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <Badge className={getStatusColor(lectureStatus)}>
                Status: {getStatusText(lectureStatus)}
              </Badge>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto min-h-[44px]"
                    disabled={lectureStatus === 'published'}
                  >
                    {lectureStatus === 'published' ? 'Publicado' : 'Publicar Aula'}
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="bg-white max-w-sm sm:max-w-md w-[95vw] sm:w-full">
                  <DialogHeader>
                    <DialogTitle>Finalizar e Publicar Aula</DialogTitle>
                    <DialogDescription>
                      Selecione a turma e matéria antes de publicar sua aula
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="publish-class">Selecionar a Turma</Label>
                      <select className="w-full p-3 border border-gray-300 rounded-md min-h-[44px] text-base">
                        <option>Cardiologia - 2025/2</option>
                        <option>Nefrologia - 2025/1</option>
                        <option>Pneumologia - 2025/2</option>
                      </select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="publish-subject">Selecionar a Matéria</Label>
                      <select className="w-full p-3 border border-gray-300 rounded-md min-h-[44px] text-base">
                        <option>Fisiologia Cardiovascular</option>
                        <option>Distúrbios Hidroeletrolíticos</option>
                        <option>Patologias Respiratórias</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700 min-h-[44px]"
                        onClick={handlePublish}
                      >
                        Confirmar e Publicar
                      </Button>
                      <DialogClose asChild>
                        <Button variant="outline" className="min-h-[44px]">Cancelar</Button>
                      </DialogClose>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Content - Full width on mobile */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              {/* Material Didático - Moved to top */}
              <Card className="bg-white shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Material Didático</CardTitle>
                  <CardDescription>
                    Adicione arquivos complementares à sua aula
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Single Upload Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary cursor-pointer transition-colors">
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 font-medium">Adicionar Arquivos</p>
                          <p className="text-xs text-gray-400">Clique para selecionar arquivos</p>
                        </div>
                      </div>
                    </DialogTrigger>
                    
                    <DialogContent className="bg-white max-w-md">
                      <DialogHeader>
                        <DialogTitle>Adicionar Material Didático</DialogTitle>
                        <DialogDescription>
                          Selecione os arquivos que deseja anexar à aula
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* Upload Area */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-sm font-medium mb-2">Arraste arquivos aqui ou clique para selecionar</p>
                          <p className="text-xs text-gray-500">PDFs, imagens, vídeos e áudios são aceitos</p>
                        </div>
                        
                        {/* Simulated File List */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Arquivos selecionados:</h4>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                              <FileText className="h-4 w-4 text-red-500" />
                              <span className="flex-1">Apresentacao_Cardiologia.pdf</span>
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">PDF</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                              <Image className="h-4 w-4 text-blue-500" />
                              <span className="flex-1">Eletrocardiograma_Exemplo.png</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Imagem</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                              <AudioLines className="h-4 w-4 text-green-500" />
                              <span className="flex-1">Ausculta_Cardiaca.mp3</span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Áudio</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                          <Button 
                            className="flex-1 bg-primary hover:bg-primary/90"
                            onClick={() => {
                              // Simulate adding files to the main list
                              const newFiles = [
                                { id: '1', name: 'Apresentacao_Cardiologia.pdf', type: 'pdf' },
                                { id: '2', name: 'Eletrocardiograma_Exemplo.png', type: 'image' },
                                { id: '3', name: 'Ausculta_Cardiaca.mp3', type: 'audio' }
                              ];
                              setUploadedFiles(prev => [...prev, ...newFiles]);
                            }}
                          >
                            Anexar Arquivos
                          </Button>
                          <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Arquivos Carregados:</h4>
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                          {file.type === 'pdf' && <FileText className="h-4 w-4 text-red-500" />}
                          {file.type === 'image' && <Image className="h-4 w-4 text-green-500" />}
                          {file.type === 'video' && <Video className="h-4 w-4 text-blue-500" />}
                          {file.type === 'audio' && <AudioLines className="h-4 w-4 text-purple-500" />}
                          <span className="flex-1 truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-4">
                    <Label htmlFor="lecture-title">Título da Aula</Label>
                  </div>
                  <Input
                    id="lecture-title"
                    value={lectureTitle}
                    onChange={(e) => setLectureTitle(e.target.value)}
                    className="text-lg font-semibold"
                  />
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="raw" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-auto p-1">
                      <TabsTrigger value="raw" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm whitespace-nowrap">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="text-center truncate">Transcrição</span>
                      </TabsTrigger>
                      <TabsTrigger value="structured" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm whitespace-nowrap">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="text-center truncate">Estruturado</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="raw" className="mt-6">
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Transcrição com timestamps e identificação de falante</span>
                          </div>
                          <Button variant="ghost" size="sm" className="self-start sm:self-auto">
                            <Edit2 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-lg">
                          <Textarea
                            value={rawTranscript}
                            className="min-h-[300px] sm:min-h-[400px] font-mono text-sm border-0 p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="A transcrição aparecerá aqui..."
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="structured" className="mt-6">
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Conteúdo organizado automaticamente pela IA</span>
                          </div>
                          <Button variant="ghost" size="sm" className="self-start sm:self-auto">
                            <Edit2 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-lg">
                          <Textarea
                            value={structuredContent}
                            className="min-h-[300px] sm:min-h-[400px] text-sm border-0 p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="O conteúdo estruturado aparecerá aqui..."
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Below main content on mobile */}
            <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
              {/* AI Summary */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo da IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {aiSummary}
                  </p>
                </CardContent>
              </Card>

              {/* Material section removed as it's now at the top */}
            </div>
          </div>
        </div>
        
        {/* Add bottom padding to prevent content being hidden by floating menus */}
        <div className="h-20 sm:h-16"></div>
      </div>
    </MainLayout>
  );
};

export default LectureTranscription;