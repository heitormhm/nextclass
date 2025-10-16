import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Highlighter, List, ListOrdered, 
  ImagePlus, Type, Save, ArrowLeft, BookOpen, Tag, 
  Sparkles, X, Loader2, Download, CheckCircle2, FileText,
  Maximize2, Minimize2, BookCheck, AlertTriangle, Mic, Undo, Redo, AlertCircle
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
  const [isLoadingAnnotation, setIsLoadingAnnotation] = useState(false);
  
  // History state for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice transcription refs
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing annotation
  useEffect(() => {
    const loadAnnotation = async () => {
      if (!id || id === 'new' || !user) return;
      
      setIsLoadingAnnotation(true);
      try {
        const { data, error } = await supabase
          .from('annotations')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Error loading annotation:', error);
          toast.error('Erro ao carregar anotação');
          navigate('/annotations');
          return;
        }
        
        if (data) {
          setTitle(data.title || '');
          setContent(data.content || '');
          setTags(data.tags || []);
          
          // Update editor content
          if (editorRef.current) {
            editorRef.current.innerHTML = data.content || '';
          }
          
          // Initialize history
          if (data.content) {
            setHistory([data.content]);
            setHistoryIndex(0);
          }
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        toast.error('Erro ao carregar anotação');
      } finally {
        setIsLoadingAnnotation(false);
      }
    };
    
    loadAnnotation();
  }, [id, user, navigate]);

  // Sync content to editor when editor becomes available
  useEffect(() => {
    if (editorRef.current && content && !isLoadingAnnotation) {
      editorRef.current.innerHTML = content;
    }
  }, [content, isLoadingAnnotation]);

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

  // Initialize history with first content
  useEffect(() => {
    if (content && history.length === 0) {
      setHistory([content]);
      setHistoryIndex(0);
    }
  }, []);

  // Handle Enter key to prevent unwanted scroll
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleEnterKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        
        // Inserir quebra de linha
        const br = document.createElement('br');
        range.deleteContents();
        range.insertNode(br);
        
        // Criar espaço após o br
        const textNode = document.createTextNode('\u200B');
        range.setStartAfter(br);
        range.insertNode(textNode);
        
        // Posicionar cursor
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        range.collapse(true);
        
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Scroll automático nativo do contentEditable
        requestAnimationFrame(() => {
          // Criar elemento temporário na posição do cursor
          const marker = document.createElement('span');
          marker.innerHTML = '&nbsp;';
          marker.style.display = 'inline';
          
          const currentRange = window.getSelection()?.getRangeAt(0);
          if (currentRange) {
            currentRange.insertNode(marker);
            
            // Scroll suave para o marcador DENTRO do editor
            marker.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'nearest'
            });
            
            // Remover marcador e restaurar cursor
            const parent = marker.parentNode;
            if (parent) {
              parent.removeChild(marker);
              
              // Restaurar seleção
              const newRange = document.createRange();
              newRange.setStartAfter(textNode);
              newRange.setEndAfter(textNode);
              newRange.collapse(true);
              
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(newRange);
            }
          }
        });
        
        // Salvar alterações
        handleInput();
      }
    };

    editor.addEventListener('keydown', handleEnterKey, true);
    return () => editor.removeEventListener('keydown', handleEnterKey, true);
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Cleanup voice recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const saveToHistory = (newContent: string) => {
    if (isUndoRedoAction) return; // Don't save during undo/redo
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    
    // Keep only last 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setIsUndoRedoAction(true);
      const previousContent = history[historyIndex - 1];
      setContent(previousContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = previousContent;
      }
      setHistoryIndex(historyIndex - 1);
      toast.info('Desfeito');
      setTimeout(() => setIsUndoRedoAction(false), 100);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedoAction(true);
      const nextContent = history[historyIndex + 1];
      setContent(nextContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = nextContent;
      }
      setHistoryIndex(historyIndex + 1);
      toast.info('Refeito');
      setTimeout(() => setIsUndoRedoAction(false), 100);
    }
  };

  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      saveToHistory(newContent);
    }
  }, [historyIndex, history]);

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
        saveToHistory(data.formattedContent);
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

  const generateTitleWithAI = async () => {
    if (!content.trim()) {
      toast.error('Escreva conteúdo antes de gerar o título');
      return;
    }

    setIsGeneratingTitle(true);
    
    try {
      console.log('🪄 Gerando título com IA...');
      
      // Extract plain text from HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainTextContent = tempDiv.textContent || tempDiv.innerText || '';
      
      console.log('📄 Texto extraído (primeiros 200 chars):', plainTextContent.substring(0, 200));
      
      const { data, error } = await supabase.functions.invoke('generate-annotation-title', {
        body: { content: plainTextContent }
      });

      if (error) {
        console.error('❌ Erro ao gerar título:', error);
        throw error;
      }
      
      if (data?.title) {
        setTitle(data.title);
        console.log('✅ Título gerado:', data.title);
        toast.success('Título gerado com sucesso!');
      }
      
    } catch (error) {
      console.error('Error generating title:', error);
      toast.error('Erro ao gerar título');
    } finally {
      setIsGeneratingTitle(false);
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
    if (editorRef.current && !isUndoRedoAction) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      
      // Debounce history save
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
      historyTimeoutRef.current = setTimeout(() => {
        saveToHistory(newContent);
      }, 500);
    }
  };

  const startVoiceTranscription = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-PT';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        toast.success('A ouvir... Fale naturalmente.');
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Inserir texto em tempo real no editor
        if (editorRef.current) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // Se temos resultado final, inserir permanentemente
            if (finalTranscript) {
              const textNode = document.createTextNode(finalTranscript);
              range.insertNode(textNode);
              
              // Mover cursor para depois do texto
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              selection.removeAllRanges();
              selection.addRange(range);
              
              // Salvar conteúdo
              handleInput();
            }
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          toast.error('Permissão negada. Permita acesso ao microfone.');
        } else if (event.error !== 'no-speech') {
          toast.error('Erro no reconhecimento de voz. Tente novamente.');
        }
        
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        // Reiniciar se ainda estamos gravando
        if (isRecording) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
            setIsRecording(false);
          }
        }
      };

      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast.error('Não foi possível iniciar o reconhecimento de voz.');
    }
  };

  const stopVoiceTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success('Transcrição parada.');
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopVoiceTranscription();
    } else {
      startVoiceTranscription();
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

  // Show loading indicator when loading an existing annotation
  if (isLoadingAnnotation) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando anotação...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

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
                onClick={() => {
                  console.log('🔙 Navegando de volta...');
                  navigate('/annotations');
                }}
                className="mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="Título da Anotação"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold text-center border-none focus-visible:ring-0 bg-transparent"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateTitleWithAI}
                  disabled={isGeneratingTitle || !content.trim()}
                  title="Gerar título automático com IA"
                  className="shrink-0 hover:bg-purple-100 hover:text-purple-600"
                >
                  {isGeneratingTitle ? (
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  )}
                </Button>
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
                    'min-h-[700px] max-h-[700px] overflow-y-auto p-8 rounded-lg',
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
            <Card className="shadow-2xl border-0 bg-white min-w-[800px] max-w-[90vw]">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 flex-nowrap">
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

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  title="Refazer (Ctrl+Shift+Z)"
                >
                  <Redo className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300 mx-1" />
                
                <Button variant="ghost" size="sm" onClick={handleHighlight} title="Destacar">
                  <Highlighter className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300 mx-1" />
                
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleVoiceToggle} 
                    title={isRecording ? "Parar transcrição" : "Iniciar transcrição de voz"}
                    className={cn(
                      "transition-all min-w-[40px]",
                      isRecording && "bg-red-100 text-red-600 animate-pulse min-w-[110px]"
                    )}
                  >
                    {isRecording ? (
                      <div className="flex items-center gap-1.5 justify-center">
                        <Mic className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs font-medium whitespace-nowrap">Gravando</span>
                      </div>
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
          <DropdownMenuContent side="left" align="end" className="w-80 p-2 max-h-[80vh] overflow-y-auto">
            <DropdownMenuLabel className="text-purple-600 font-semibold flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5" />
              Assistente IA Mia
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Grammar Check */}
            <DropdownMenuItem onClick={() => handleAIAction('fix_grammar')} className="cursor-pointer py-3">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              <span className="font-medium">Corrigir erros gramaticais</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-2" />
            
            {/* Tone Adjustment Section */}
            <DropdownMenuLabel className="text-xs font-bold text-gray-600 uppercase tracking-wider px-2 py-1">
              📝 Ajustar Tom
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleAIAction('tone_formal')} className="cursor-pointer pl-6 py-2">
              <FileText className="h-4 w-4 mr-2 text-blue-600" />
              <div className="flex flex-col">
                <span className="font-medium">Tom Formal</span>
                <span className="text-xs text-muted-foreground">Vocabulário técnico e preciso</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('tone_informal')} className="cursor-pointer pl-6 py-2">
              <FileText className="h-4 w-4 mr-2 text-orange-600" />
              <div className="flex flex-col">
                <span className="font-medium">Tom Informal</span>
                <span className="text-xs text-muted-foreground">Linguagem do dia a dia</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('tone_professional')} className="cursor-pointer pl-6 py-2">
              <FileText className="h-4 w-4 mr-2 text-purple-600" />
              <div className="flex flex-col">
                <span className="font-medium">Tom Profissional</span>
                <span className="text-xs text-muted-foreground">Jargão técnico especializado</span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-2" />
            
            {/* Text Size Section */}
            <DropdownMenuLabel className="text-xs font-bold text-gray-600 uppercase tracking-wider px-2 py-1">
              📏 Modificar Tamanho do Texto
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleAIAction('extend_text')} className="cursor-pointer pl-6 py-2">
              <Maximize2 className="h-4 w-4 mr-2 text-indigo-600" />
              <span className="font-medium">Estender texto</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('shorten_text')} className="cursor-pointer pl-6 py-2">
              <Minimize2 className="h-4 w-4 mr-2 text-teal-600" />
              <span className="font-medium">Encurtar texto</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-2" />
            
            {/* Structure & Language Section */}
            <DropdownMenuLabel className="text-xs font-bold text-gray-600 uppercase tracking-wider px-2 py-1">
              🎯 Modificar Estrutura e Linguagem
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleAIAction('improve_didactic')} className="cursor-pointer pl-6 py-2">
              <BookOpen className="h-4 w-4 mr-2 text-pink-600" />
              <div className="flex flex-col">
                <span className="font-medium">Tornar mais didático</span>
                <span className="text-xs text-muted-foreground">Tabelas, diagramas e exemplos</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('fact_check')} className="cursor-pointer pl-6 py-2">
              <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
              <span className="font-medium">Verificar informações</span>
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
