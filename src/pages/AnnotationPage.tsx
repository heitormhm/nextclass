import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Highlighter, List, ListOrdered, 
  ImagePlus, Type, Save, ArrowLeft, BookOpen, Tag, 
  Sparkles, X, Loader2, Download, CheckCircle2, FileText,
  Maximize2, Minimize2, BookCheck, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';

interface Flashcard {
  front: string;
  back: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface StudyMaterials {
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

const AnnotationPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [dialogTags, setDialogTags] = useState<string[]>([]);
  const [dialogTagInput, setDialogTagInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  useEffect(() => {
    if (location.state?.prePopulatedContent) {
      setContent(location.state.prePopulatedContent);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  }, []);

  const generateTitleWithAI = async () => {
    if (!content.trim()) {
      toast.error('Escreva algum conteúdo primeiro');
      return;
    }

    setIsGeneratingTitle(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-annotation-title', {
        body: { content }
      });
      
      if (error) throw error;
      
      if (data?.title) {
        setTitle(data.title);
        toast.success('Título gerado por IA!');
      }
    } catch (error) {
      console.error('Error generating title:', error);
      toast.error('Erro ao gerar título');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    let finalTitle = title.trim();
    
    if (!finalTitle && content.trim()) {
      await generateTitleWithAI();
      finalTitle = title.trim();
    }

    if (!finalTitle) {
      toast.error('Por favor, adicione um título');
      return;
    }

    setIsSaving(true);
    try {
      if (id && id !== 'new') {
        const { error } = await supabase
          .from('annotations')
          .update({
            title: finalTitle,
            content,
            tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('annotations')
          .insert({
            user_id: user.id,
            title: finalTitle,
            content,
            tags,
            source_type: location.state?.sourceType,
            source_id: location.state?.sourceId,
          });
        
        if (error) throw error;
      }
      
      toast.success('Anotação salva com sucesso!');
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error('Erro ao salvar anotação');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    setDialogTags(tags);
    setShowSaveDialog(true);
  };

  const handleFinalSave = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    let finalTitle = title.trim();
    
    if (!finalTitle && content.trim()) {
      await generateTitleWithAI();
      finalTitle = title.trim();
    }

    if (!finalTitle) {
      toast.error('Por favor, adicione um título');
      return;
    }

    setIsSaving(true);
    try {
      if (id && id !== 'new') {
        const { error } = await supabase
          .from('annotations')
          .update({
            title: finalTitle,
            content,
            tags: dialogTags,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('annotations')
          .insert({
            user_id: user.id,
            title: finalTitle,
            content,
            tags: dialogTags,
            source_type: location.state?.sourceType,
            source_id: location.state?.sourceId,
          });
        
        if (error) throw error;
      }
      
      toast.success('Anotação salva com sucesso!');
      setShowSaveDialog(false);
      navigate('/annotations');
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error('Erro ao salvar anotação');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Adicione título e conteúdo antes de exportar');
      return;
    }

    try {
      toast.info('Funcionalidade de exportação PDF será adicionada em breve');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleAIAction = async (actionType: string) => {
    if (!content.trim()) {
      toast.error('Escreva conteúdo antes de usar a IA');
      return;
    }

    setIsProcessingAI(true);
    
    try {
      const { data: jobData, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: 'ai_text_formatting',
          status: 'PENDING',
          input_payload: { 
            content, 
            title,
            action: actionType,
            annotation_id: id 
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Processando com IA...`);
      
      const pollInterval = setInterval(async () => {
        const { data: updatedJob } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobData.id)
          .single();

        if (updatedJob?.status === 'COMPLETED') {
          clearInterval(pollInterval);
          const result = JSON.parse(updatedJob.result || '{}');
          
          if (result.formattedContent) {
            setContent(result.formattedContent);
            if (editorRef.current) {
              editorRef.current.innerHTML = result.formattedContent;
            }
            toast.success('Texto formatado com sucesso!');
          }
          
          if (result.suggestions) {
            toast.info(`Sugestões: ${result.suggestions}`);
          }
          
          setIsProcessingAI(false);
        } else if (updatedJob?.status === 'FAILED') {
          clearInterval(pollInterval);
          toast.error('Erro ao processar com IA');
          setIsProcessingAI(false);
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (isProcessingAI) {
          setIsProcessingAI(false);
          toast.error('Tempo esgotado');
        }
      }, 60000);
      
    } catch (error) {
      console.error('Error creating AI job:', error);
      toast.error('Erro ao processar com IA');
      setIsProcessingAI(false);
    }
  };

  const generateTagsWithAI = async () => {
    if (!content.trim()) {
      toast.error('Escreva conteúdo primeiro');
      return;
    }

    setIsGeneratingTags(true);
    
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: 'generate_annotation_tags',
          status: 'PENDING',
          input_payload: { 
            content, 
            title,
            annotation_id: id 
          }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      toast.success('Tags sendo geradas...');
      
      const pollInterval = setInterval(async () => {
        const { data: updatedJob } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobData.id)
          .single();

        if (updatedJob?.status === 'COMPLETED') {
          clearInterval(pollInterval);
          const tags = JSON.parse(updatedJob.result || '[]');
          setSuggestedTags(tags);
          toast.success('Tags sugeridas geradas!');
          setIsGeneratingTags(false);
        } else if (updatedJob?.status === 'FAILED') {
          clearInterval(pollInterval);
          toast.error('Erro ao gerar tags');
          setIsGeneratingTags(false);
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGeneratingTags) {
          setIsGeneratingTags(false);
          toast.error('Tempo esgotado');
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Erro ao criar tarefa');
      setIsGeneratingTags(false);
    }
  };

  const handleHighlight = () => {
    executeCommand('hiliteColor', '#fef08a');
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const placeholderUrl = 'https://via.placeholder.com/300x200?text=Imagem+Carregada';
        executeCommand('insertHTML', `<img src="${placeholderUrl}" alt="Imagem carregada" style="max-width: 100%; height: auto; margin: 10px 0;" />`);
        toast.success('Imagem inserida com sucesso!');
      }
    };
    input.click();
  };

  const handleAddTextbox = () => {
    const textboxHtml = `
      <div style="border: 2px dashed #e2e8f0; padding: 10px; margin: 10px 0; background: #f8fafc;">
        <p style="margin: 0; color: #64748b; font-style: italic;">Clique para editar este textbox...</p>
      </div>
    `;
    executeCommand('insertHTML', textboxHtml);
    toast.success('Textbox adicionado!');
  };

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50 to-pink-100">
        {/* Fixed Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold bg-transparent border-none focus:outline-none w-full"
                  placeholder="Título da Anotação"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveAndExit}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Salvar e Sair</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - FULL WIDTH */}
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-5xl mx-auto">
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-xl">
              <CardContent className="p-8">
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleInput}
                  dangerouslySetInnerHTML={{ __html: content }}
                  className={cn(
                    'min-h-[700px] p-8 rounded-lg',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20',
                    'prose prose-lg max-w-none',
                    '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-800 [&_h2]:mb-4',
                    '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2',
                    '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2',
                    '[&_li]:text-gray-700',
                    '[&_p]:text-gray-700 [&_p]:leading-relaxed',
                    !content && 'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text'
                  )}
                  data-placeholder="Comece a escrever sua anotação..."
                  style={{ lineHeight: '1.8', fontSize: '17px' }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Toolbar - CENTRALIZADA E LARGA */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30">
          <Card className="shadow-2xl border-0 bg-white max-w-[95vw]">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                <Button variant="ghost" size="sm" onClick={() => executeCommand('bold')} title="Negrito">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => executeCommand('italic')} title="Itálico">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => executeCommand('underline')} title="Sublinhado">
                  <Underline className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300 mx-1" />
                
                <Button variant="ghost" size="sm" onClick={handleHighlight} title="Destacar">
                  <Highlighter className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300 mx-1" />
                
                <Button variant="ghost" size="sm" onClick={() => executeCommand('insertUnorderedList')} title="Lista">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => executeCommand('insertOrderedList')} title="Lista numerada">
                  <ListOrdered className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300 mx-1" />
                
                <Button variant="ghost" size="sm" onClick={handleImageUpload} title="Inserir Imagem">
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleAddTextbox} title="Adicionar Textbox">
                  <Type className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300 mx-1" />
                
                <Button onClick={handleSave} size="sm" className="bg-primary hover:bg-primary/90 text-white whitespace-nowrap">
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Floating AI Assistant Button com Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="fixed bottom-28 right-8 rounded-full w-16 h-16 shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 z-40"
              size="icon"
              title="Assistente IA Mia"
              disabled={isProcessingAI}
            >
              {isProcessingAI ? (
                <Loader2 className="h-7 w-7 text-white animate-spin" />
              ) : (
                <Sparkles className="h-7 w-7 text-white" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="left" align="end" className="w-72 p-2">
            <DropdownMenuLabel className="text-purple-600 font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Assistente IA Mia
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleAIAction('fix_grammar')} className="cursor-pointer">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              Corrigir erros gramaticais
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Ajustar Tom
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleAIAction('tone_formal')} className="cursor-pointer pl-6">
              <FileText className="h-4 w-4 mr-2 text-blue-600" />
              Tom Formal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('tone_informal')} className="cursor-pointer pl-6">
              <FileText className="h-4 w-4 mr-2 text-orange-600" />
              Tom Informal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('tone_professional')} className="cursor-pointer pl-6">
              <FileText className="h-4 w-4 mr-2 text-purple-600" />
              Tom Profissional
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleAIAction('extend_text')} className="cursor-pointer">
              <Maximize2 className="h-4 w-4 mr-2 text-indigo-600" />
              Estender texto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('shorten_text')} className="cursor-pointer">
              <Minimize2 className="h-4 w-4 mr-2 text-pink-600" />
              Encurtar texto
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleAIAction('improve_didactic')} className="cursor-pointer">
              <BookCheck className="h-4 w-4 mr-2 text-teal-600" />
              Tornar mais didático
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('fact_check')} className="cursor-pointer">
              <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
              Verificar informações
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save Dialog com Tags e PDF */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Salvar Anotação</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">Adicionar Tags</Label>
                
                <Button
                  onClick={async () => {
                    await generateTagsWithAI();
                    if (suggestedTags.length > 0) {
                      setDialogTags([...dialogTags, ...suggestedTags.filter(tag => !dialogTags.includes(tag))]);
                    }
                  }}
                  disabled={isGeneratingTags}
                  variant="outline"
                  size="sm"
                  className="w-full mb-3"
                >
                  {isGeneratingTags ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando tags...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Sugerir Tags com IA</>
                  )}
                </Button>
                
                <div className="flex gap-2 mb-3">
                  <Input
                    value={dialogTagInput}
                    onChange={(e) => setDialogTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        if (dialogTagInput.trim() && !dialogTags.includes(dialogTagInput.trim())) {
                          setDialogTags([...dialogTags, dialogTagInput.trim()]);
                          setDialogTagInput('');
                        }
                      }
                    }}
                    placeholder="Digite uma tag e pressione Enter..."
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => {
                      if (dialogTagInput.trim() && !dialogTags.includes(dialogTagInput.trim())) {
                        setDialogTags([...dialogTags, dialogTagInput.trim()]);
                        setDialogTagInput('');
                      }
                    }}
                    size="sm"
                  >
                    Adicionar
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {dialogTags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1 py-1 px-3">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => setDialogTags(dialogTags.filter(t => t !== tag))} 
                      />
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-base font-semibold mb-3 block">Exportar como PDF</Label>
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="w-full border-pink-500 text-pink-500 hover:bg-pink-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowSaveDialog(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleFinalSave}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                disabled={isSaving}
              >
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Salvar e Sair</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
};

export default AnnotationPage;
