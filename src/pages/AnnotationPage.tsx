import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Highlighter, List, ListOrdered, 
  ImagePlus, Type, Save, ArrowLeft, BookOpen, Tag, 
  Sparkles, X, Loader2, Download, CheckCircle2, FileText,
  Maximize2, Minimize2, BookCheck, AlertTriangle, Mic
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
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (location.state?.prePopulatedContent) {
      setContent(location.state.prePopulatedContent);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Set initial content once on mount
  useEffect(() => {
    if (editorRef.current && content && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, []);

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
    console.log('🤖 Iniciando ação IA:', actionType);
    
    if (!content.trim()) {
      toast.error('Escreva conteúdo antes de usar a IA');
      return;
    }

    setIsProcessingAI(true);
    
    try {
      console.log('📝 Enviando para edge function:', { action: actionType });
      
      // Chamar edge function DIRETAMENTE (não usa jobs)
      const { data, error } = await supabase.functions.invoke('ai-text-formatting', {
        body: { 
          content, 
          action: actionType 
        }
      });

      if (error) {
        console.error('❌ Erro ao chamar edge function:', error);
        throw error;
      }
      
      console.log('✅ Resposta recebida:', data);
      
      if (data?.formattedContent) {
        setContent(data.formattedContent);
        if (editorRef.current) {
          editorRef.current.innerHTML = data.formattedContent;
        }
        toast.success('Texto formatado com sucesso!');
      }
      
      if (data?.suggestions) {
        toast.info(`Sugestões: ${data.suggestions}`, {
          duration: 8000,
        });
      }
      
      setIsProcessingAI(false);
      
    } catch (error) {
      console.error('❌ Error processing with AI:', error);
      toast.error('Erro ao processar com IA');
      setIsProcessingAI(false);
    }
  };

  const generateTagsWithAI = async () => {
    if (!content.trim()) {
      toast.error('Escreva conteúdo antes de gerar tags');
      return;
    }

    setIsGeneratingTags(true);
    
    try {
      console.log('🏷️ Gerando tags com IA...');
      
      // Chamar edge function diretamente
      const { data, error } = await supabase.functions.invoke('generate-annotation-tags', {
        body: { 
          content,
          title: title || 'Sem título'
        }
      });

      if (error) {
        console.error('❌ Erro ao gerar tags:', error);
        throw error;
      }
      
      console.log('✅ Tags geradas:', data);
      
      if (data?.tags && Array.isArray(data.tags)) {
        setSuggestedTags(data.tags);
        toast.success('Tags geradas com sucesso!');
      } else {
        toast.error('Formato de resposta inválido');
      }
      
    } catch (error) {
      console.error('Error generating tags:', error);
      toast.error('Erro ao gerar tags');
    } finally {
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

  const handleStartVoiceTranscription = async () => {
    console.log('🎤 Iniciando transcrição de voz');
    setIsRecording(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🎤 Gravação finalizada, processando...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          console.log('📤 Enviando áudio para transcrição');
          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: { audio: base64Audio }
          });
          
          if (error) {
            console.error('❌ Erro na transcrição:', error);
            throw error;
          }
          
          if (data?.text) {
            console.log('✅ Transcrição recebida:', data.text);
            
            // Inserir texto no cursor
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              const textNode = document.createTextNode(data.text + ' ');
              range.insertNode(textNode);
              
              // Move cursor para o final do texto inserido
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              selection.removeAllRanges();
              selection.addRange(range);
            }
            
            if (editorRef.current) {
              setContent(editorRef.current.innerHTML);
            }
            
            toast.success('Transcrição inserida!');
          }
        };
        
        reader.readAsDataURL(audioBlob);
      };
      
      mediaRecorder.start();
      toast.info('Gravando... (10 segundos)');
      
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        }
      }, 10000);
      
    } catch (error) {
      console.error('❌ Erro ao acessar microfone:', error);
      toast.error('Erro ao acessar microfone');
      setIsRecording(false);
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
                  className="text-2xl font-bold bg-transparent border-none focus:outline-none w-full text-center"
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
                  suppressContentEditableWarning={true}
                  onInput={handleInput}
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
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleStartVoiceTranscription} 
                  title="Transcrever Voz"
                  disabled={isRecording}
                  className={cn(
                    isRecording && "bg-red-100 text-red-600"
                  )}
                >
                  {isRecording ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
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
              className="fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 z-40"
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

        {/* Save Dialog com Tags e PDF - REDESENHADO */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-2xl border-0 shadow-2xl">
            <DialogHeader className="text-center pb-6 border-b">
              <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent py-2">
                Salvar Anotação
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-6">
              {/* Seção Tags com Frosting */}
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                <Label className="text-lg font-bold mb-4 block text-gray-800">
                  Adicionar Tags
                </Label>
                
                <Button
                  onClick={async () => {
                    await generateTagsWithAI();
                    if (suggestedTags.length > 0) {
                      setDialogTags([...dialogTags, ...suggestedTags.filter(tag => !dialogTags.includes(tag))]);
                    }
                  }}
                  disabled={isGeneratingTags}
                  className="w-full mb-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-6 rounded-xl shadow-lg"
                >
                  {isGeneratingTags ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Gerando tags...</>
                  ) : (
                    <><Sparkles className="h-5 w-5 mr-2" />Sugerir Tags com IA</>
                  )}
                </Button>
                
                <div className="flex gap-2 mb-4">
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
                    className="flex-1 bg-white/80 backdrop-blur-sm border-2 border-purple-200 focus:border-purple-500 rounded-xl px-4 py-3"
                  />
                  <Button 
                    onClick={() => {
                      if (dialogTagInput.trim() && !dialogTags.includes(dialogTagInput.trim())) {
                        setDialogTags([...dialogTags, dialogTagInput.trim()]);
                        setDialogTagInput('');
                      }
                    }}
                    className="bg-pink-500 hover:bg-pink-600 text-white px-6 rounded-xl"
                  >
                    Adicionar
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {dialogTags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      className="bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 border-2 border-purple-300 py-2 px-4 text-sm font-medium rounded-full flex items-center gap-2"
                    >
                      {tag}
                      <X 
                        className="h-4 w-4 cursor-pointer hover:text-red-600 transition-colors" 
                        onClick={() => setDialogTags(dialogTags.filter(t => t !== tag))} 
                      />
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Seção PDF com Frosting */}
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
                <Label className="text-lg font-bold mb-4 block text-gray-800">
                  Exportar como PDF
                </Label>
                <Button
                  onClick={handleExportPDF}
                  className="w-full bg-white/80 backdrop-blur-sm border-2 border-pink-300 text-pink-600 hover:bg-pink-50 hover:border-pink-500 font-semibold py-6 rounded-xl shadow-lg transition-all"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
            
            {/* Footer com Botões Melhor Posicionados */}
            <DialogFooter className="flex flex-row items-center justify-between pt-6 border-t gap-4">
              <Button 
                variant="outline" 
                onClick={() => setShowSaveDialog(false)}
                disabled={isSaving}
                className="flex-1 px-8 py-6 text-base font-medium rounded-xl border-2 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleFinalSave}
                className="flex-1 px-8 py-6 text-base font-semibold rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg"
                disabled={isSaving}
              >
                {isSaving ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Salvando...</>
                ) : (
                  <><Save className="h-5 w-5 mr-2" />Salvar e Sair</>
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
