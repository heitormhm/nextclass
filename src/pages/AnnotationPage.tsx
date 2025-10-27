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
import { StudentBackgroundGrid } from '@/components/ui/student-background-grid';

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
          // First update state
          setTitle(data.title || '');
          setTags(data.tags || []);
          
          // IMPORTANT: Use setTimeout to ensure DOM is ready
          setTimeout(() => {
            if (editorRef.current && data.content) {
              editorRef.current.innerHTML = data.content;
              setContent(data.content);
              
              // Initialize history
              setHistory([data.content]);
              setHistoryIndex(0);
            }
          }, 100);
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

  // Removed: useEffect that caused race condition by syncing content → innerHTML

  useEffect(() => {
    if (location.state?.prePopulatedContent) {
      setContent(location.state.prePopulatedContent);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Removed: Redundant initialization useEffect (already handled in data loading useEffect)

  // Initialize history with first content
  useEffect(() => {
    if (content && history.length === 0) {
      setHistory([content]);
      setHistoryIndex(0);
    }
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
        // Save scroll position
        const scrollTop = editorRef.current.scrollTop;
        
        editorRef.current.innerHTML = previousContent;
        
        // Restore scroll
        editorRef.current.scrollTop = scrollTop;
        
        // Move cursor to end
        const range = document.createRange();
        const selection = window.getSelection();
        if (editorRef.current.lastChild) {
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
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
        // Save scroll position
        const scrollTop = editorRef.current.scrollTop;
        
        editorRef.current.innerHTML = nextContent;
        
        // Restore scroll
        editorRef.current.scrollTop = scrollTop;
        
        // Move cursor to end
        const range = document.createRange();
        const selection = window.getSelection();
        if (editorRef.current.lastChild) {
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
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
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/30">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-100/40 to-purple-100/40 rounded-full filter blur-3xl opacity-40" />
          <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-br from-purple-100/40 to-teal-100/40 rounded-full filter blur-3xl opacity-40" />
          <StudentBackgroundGrid />
          
          <div className="relative z-10 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Carregando anotação...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

export default AnnotationPage;
