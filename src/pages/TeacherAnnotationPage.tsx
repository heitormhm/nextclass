import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Highlighter, List, ListOrdered, 
  ImagePlus, Type, Save, ArrowLeft, Tag, 
  Sparkles, X, Loader2, CheckCircle2, FileText, FileDown,
  Mic, Undo, Redo, BookOpen, Table as TableIcon, 
  Lightbulb, GraduationCap, ShieldCheck, Edit, Eye, EyeOff, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { StructuredContentRenderer } from '@/components/StructuredContentRenderer';
import { generateVisualPDF } from '@/utils/visualPdfGenerator';
import { generateReportPDF } from '@/utils/pdfGenerator';
import { structuredContentToMarkdown } from '@/utils/structuredContentToMarkdown';
import { SyntaxHighlightedEditor } from '@/components/annotation-editor/SyntaxHighlightedEditor';
import { MarkerToolbar } from '@/components/annotation-editor/MarkerToolbar';
import { PreviewPanel } from '@/components/annotation-editor/PreviewPanel';
import { ShortcutsDialog } from '@/components/annotation-editor/ShortcutsDialog';
import { structuredToPlaintext } from '@/utils/structuredToPlaintext';
import { validateAnnotationMarkers, ValidationError } from '@/utils/annotationValidation';
import { useKeyboardShortcuts, getAnnotationEditorShortcuts } from '@/hooks/useKeyboardShortcuts';
const TeacherAnnotationPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
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
  const [hasInitializedHistory, setHasInitializedHistory] = useState(false);
  const [preAIContent, setPreAIContent] = useState<string | null>(null);
  const [originalInputContent, setOriginalInputContent] = useState<string>('');
  const [showAIActionsSheet, setShowAIActionsSheet] = useState(false);
  
  // Toolbar is always visible - removed showToolbar state
  
  // Structured content state
  const [structuredContent, setStructuredContent] = useState<any>(null);
  const [isStructuredMode, setIsStructuredMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [plaintextContent, setPlaintextContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isParsingPreview, setIsParsingPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // PDF Export state
  const [lastAIFormattedContent, setLastAIFormattedContent] = useState<string>('');
  const [showPDFExportButton, setShowPDFExportButton] = useState(false);
  
  // History state for undo/redo (HTML editor)
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Plaintext editor undo/redo state
  const [plaintextHistory, setPlaintextHistory] = useState<string[]>([]);
  const [plaintextHistoryIndex, setPlaintextHistoryIndex] = useState(-1);
  const plaintextHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice transcription refs
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Color picker states
  const [highlightColor, setHighlightColor] = useState('#fef08a'); // Default yellow
  const [postItColor, setPostItColor] = useState('#fef08a'); // Default yellow
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const isLoading = isLoadingAnnotation;

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
          navigate('/teacher/annotations');
          return;
        }
        
        if (data) {
          setTitle(data.title || '');
          setTags(data.tags || []);
          
          // Detectar se é conteúdo estruturado
          try {
            const parsed = JSON.parse(data.content);
            if (parsed.conteudo && Array.isArray(parsed.conteudo)) {
              setStructuredContent(parsed);
              setIsStructuredMode(true);
              setContent(data.content); // Manter JSON para salvar
              setHistory([data.content]);
              setHistoryIndex(0);
              return;
            }
          } catch {
            // Não é JSON estruturado, continuar com HTML normal
          }
          
        setTimeout(() => {
          if (editorRef.current && data.content) {
            editorRef.current.innerHTML = data.content;
            setContent(data.content);
            
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

  useEffect(() => {
    if (location.state?.prePopulatedContent) {
      setContent(location.state.prePopulatedContent);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Capture the FIRST user input to initialize history properly
  useEffect(() => {
    if (!editorRef.current || hasInitializedHistory) return;
    
    const handleFirstInput = (e: Event) => {
      // For paste events, wait for content to be inserted into DOM
      if (e.type === 'paste') {
        setTimeout(() => {
          const currentContent = editorRef.current?.innerHTML || '';
          if (currentContent.trim() && history.length === 0) {
            console.log('[History] Capturing first paste:', currentContent.substring(0, 50));
            setHistory([currentContent]);
            setHistoryIndex(0);
            setOriginalInputContent(currentContent); // Save as original input
            setHasInitializedHistory(true);
          }
        }, 0);
      } else {
        // For regular input, capture immediately
        const currentContent = editorRef.current?.innerHTML || '';
        if (currentContent.trim() && history.length === 0) {
          console.log('[History] Capturing first input:', currentContent.substring(0, 50));
          setHistory([currentContent]);
          setHistoryIndex(0);
          setOriginalInputContent(currentContent); // Save as original input
          setHasInitializedHistory(true);
        }
      }
    };
    
    editorRef.current.addEventListener('input', handleFirstInput);
    editorRef.current.addEventListener('paste', handleFirstInput);
    
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('input', handleFirstInput);
        editorRef.current.removeEventListener('paste', handleFirstInput);
      }
    };
  }, [history.length, hasInitializedHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Route undo/redo to appropriate handler based on mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (isEditMode) {
          e.shiftKey ? handlePlaintextRedo() : handlePlaintextUndo();
        } else {
          e.shiftKey ? handleRedo() : handleUndo();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, historyIndex, history, plaintextHistoryIndex, plaintextHistory]);

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
    if (isUndoRedoAction) return;
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousContent = history[newIndex];
      
      console.log('[Undo] Current index:', historyIndex, '→ New index:', newIndex);
      console.log('[Undo] Has originalInputContent?', !!originalInputContent);
      
      // CRITICAL FIX: Se voltando para índice 0 E temos originalInputContent, usar ele
      if (newIndex === 0 && originalInputContent) {
        console.log('[Undo] 🔄 Restaurando conteúdo original do input');
        setIsUndoRedoAction(true);
        
        // Se estava em modo estruturado, desativar
        if (isStructuredMode) {
          console.log('[Undo] Desativando modo estruturado');
          setIsStructuredMode(false);
          setStructuredContent(null);
        }
        
        setContent(originalInputContent);
        if (editorRef.current) {
          editorRef.current.innerHTML = originalInputContent;
        }
        setHistoryIndex(newIndex);
        toast.info('Desfeito - Conteúdo original restaurado');
        setTimeout(() => setIsUndoRedoAction(false), 100);
        return;
      }
      
      // Lógica normal de undo para outros casos
      setIsUndoRedoAction(true);
      
      // Check if content is structured JSON
      if (isStructuredMode) {
        try {
          const parsedContent = JSON.parse(previousContent);
          if (parsedContent.conteudo) {
            setStructuredContent(parsedContent);
            setContent(previousContent);
          } else {
            // Not structured, switch back to HTML mode
            setIsStructuredMode(false);
            setStructuredContent(null);
            setContent(previousContent);
            if (editorRef.current) {
              editorRef.current.innerHTML = previousContent;
            }
          }
        } catch {
          // Failed to parse, switch to HTML mode
          setIsStructuredMode(false);
          setStructuredContent(null);
          setContent(previousContent);
          if (editorRef.current) {
            editorRef.current.innerHTML = previousContent;
          }
        }
      } else {
        setContent(previousContent);
        if (editorRef.current) {
          editorRef.current.innerHTML = previousContent;
        }
      }
      
      setHistoryIndex(newIndex);
      toast.info('Desfeito');
      setTimeout(() => setIsUndoRedoAction(false), 100);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedoAction(true);
      const nextContent = history[historyIndex + 1];
      setContent(nextContent);
      
      // Try to parse as structured content
      try {
        const parsed = JSON.parse(nextContent);
        if (parsed.conteudo && Array.isArray(parsed.conteudo)) {
          // It's structured content
          setStructuredContent(parsed);
          setIsStructuredMode(true);
          if (editorRef.current) {
            editorRef.current.innerHTML = '';
          }
        } else {
          // Not structured, treat as HTML
          setStructuredContent(null);
          setIsStructuredMode(false);
          if (editorRef.current) {
            const scrollTop = editorRef.current.scrollTop;
            editorRef.current.innerHTML = nextContent;
            editorRef.current.scrollTop = scrollTop;
          }
        }
      } catch {
        // Not JSON, treat as HTML
        setStructuredContent(null);
        setIsStructuredMode(false);
        if (editorRef.current) {
          const scrollTop = editorRef.current.scrollTop;
          editorRef.current.innerHTML = nextContent;
          editorRef.current.scrollTop = scrollTop;
          
          const range = document.createRange();
          const selection = window.getSelection();
          if (editorRef.current.lastChild) {
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }
      }
      
      setHistoryIndex(historyIndex + 1);
      toast.info('Refeito');
      setTimeout(() => setIsUndoRedoAction(false), 100);
    }
  };

  // Plaintext editor undo/redo functions
  const savePlaintextToHistory = (content: string) => {
    if (plaintextHistoryTimeoutRef.current) {
      clearTimeout(plaintextHistoryTimeoutRef.current);
    }
    
    plaintextHistoryTimeoutRef.current = setTimeout(() => {
      const newHistory = plaintextHistory.slice(0, plaintextHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) newHistory.shift();
      setPlaintextHistory(newHistory);
      setPlaintextHistoryIndex(newHistory.length - 1);
    }, 500);
  };

  const handlePlaintextUndo = () => {
    if (plaintextHistoryIndex > 0) {
      const newIndex = plaintextHistoryIndex - 1;
      setPlaintextContent(plaintextHistory[newIndex]);
      setPlaintextHistoryIndex(newIndex);
      toast.info('Desfeito');
    }
  };

  const handlePlaintextRedo = () => {
    if (plaintextHistoryIndex < plaintextHistory.length - 1) {
      const newIndex = plaintextHistoryIndex + 1;
      setPlaintextContent(plaintextHistory[newIndex]);
      setPlaintextHistoryIndex(newIndex);
      toast.info('Refeito');
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

  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    
    setActiveFormats(formats);
  }, []);

  // Update active formats on selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        updateActiveFormats();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateActiveFormats]);

  // Toggle edit mode for structured content
  const handleToggleEditMode = () => {
    if (!isStructuredMode) return;

    if (!isEditMode) {
      // Switching to edit mode: convert structured to plaintext
      const plaintext = structuredToPlaintext(structuredContent);
      setPlaintextContent(plaintext);
      setIsEditMode(true);
      
      // Initialize plaintext history
      setPlaintextHistory([plaintext]);
      setPlaintextHistoryIndex(0);
      
      // Run initial validation
      const errors = validateAnnotationMarkers(plaintext);
      setValidationErrors(errors);
    } else {
      // Switching back to view mode: cancel edits
      setIsEditMode(false);
      setShowPreview(false);
      setValidationErrors([]);
    }
  };

   // Handle marker insertion
  const handleInsertMarker = (marker: string) => {
    if (!textareaRef.current) {
      // No cursor position, just append to end
      const newContent = plaintextContent + '\n' + marker;
      setPlaintextContent(newContent);
      savePlaintextToHistory(newContent);
      const errors = validateAnnotationMarkers(newContent);
      setValidationErrors(errors);
      return;
    }
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = plaintextContent.substring(start, end);
    
    let newText = '';
    if (selectedText && !marker.includes('\n')) {
      // Wrap selected text for inline markers
      newText = marker.replace('Your text here', selectedText).replace('Your text', selectedText).replace('Seu texto aqui', selectedText).replace('Seu texto', selectedText);
    } else {
      // Insert at cursor for block markers
      newText = marker;
    }
    
    const before = plaintextContent.substring(0, start);
    const after = plaintextContent.substring(end);
    const newContent = before + newText + after;
    
    setPlaintextContent(newContent);
    savePlaintextToHistory(newContent);
    
    // Update validation
    const errors = validateAnnotationMarkers(newContent);
    setValidationErrors(errors);
    
    // Focus back to editor and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = start + newText.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle template insertion
  const handleInsertTemplate = (template: string) => {
    setPlaintextContent(template);
    savePlaintextToHistory(template);
    const errors = validateAnnotationMarkers(template);
    setValidationErrors(errors);
  };

  // Toggle preview panel
  const handleTogglePreview = async () => {
    if (!showPreview) {
      // Generate preview
      setShowPreview(true);
      await generatePreview();
    } else {
      setShowPreview(false);
    }
  };

  // Generate preview from current plaintext
  const generatePreview = async () => {
    if (!plaintextContent.trim()) {
      setPreviewData(null);
      return;
    }

    setIsParsingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-teacher-annotation', {
        body: { plaintextContent },
      });

      if (error) throw error;
      if (data?.structuredData) {
        setPreviewData(data.structuredData);
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      // Don't show error toast for preview, just log it
    } finally {
      setIsParsingPreview(false);
    }
  };

  // Update preview when content changes (debounced)
  useEffect(() => {
    if (!isEditMode || !showPreview) return;

    const timeoutId = setTimeout(() => {
      generatePreview();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [plaintextContent, isEditMode, showPreview]);

  // Validate on content change
  useEffect(() => {
    if (!isEditMode) return;

    const errors = validateAnnotationMarkers(plaintextContent);
    setValidationErrors(errors);
  }, [plaintextContent, isEditMode]);

  // Save plaintext edits by parsing with AI
  const handleSaveStructuredEdits = async () => {
    if (!isEditMode || !plaintextContent.trim()) {
      toast.error("Conteúdo vazio", {
        description: "Adicione conteúdo antes de salvar.",
      });
      return;
    }

    // Check for validation errors
    if (validationErrors.some(e => e.severity === 'error')) {
      toast.error("Erros de validação", {
        description: "Corrija os erros marcados antes de salvar.",
      });
      return;
    }

    setIsSaving(true);
    try {
      console.log('Parsing plaintext with AI...');
      
      const { data: parseData, error: parseError } = await supabase.functions.invoke(
        'parse-teacher-annotation',
        {
          body: { plaintextContent }
        }
      );

      if (parseError) {
        console.error('Parse error:', parseError);
        
        if (parseError.message?.includes('429')) {
          throw new Error('Limite de requisições excedido. Aguarde e tente novamente.');
        } else if (parseError.message?.includes('402')) {
          throw new Error('Créditos insuficientes. Adicione créditos à sua conta.');
        }
        
        throw new Error(parseError.message || 'Failed to parse content');
      }

      if (!parseData?.structuredData) {
        throw new Error('Invalid response from parser');
      }

      console.log('Successfully parsed to structured format');

      // Update structured data
      const newStructuredData = parseData.structuredData;
      setStructuredContent(newStructuredData);
      
      // Save to database
      const contentToSave = JSON.stringify(newStructuredData);

      if (id) {
        const { error: updateError } = await supabase
          .from('annotations')
          .update({
            content: contentToSave,
            title: title.trim() || 'Anotação sem título',
            tags,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user?.id);

        if (updateError) throw updateError;
      } else {
        const { data: newAnnotation, error: insertError } = await supabase
          .from('annotations')
          .insert({
            content: contentToSave,
            title: title.trim() || 'Anotação sem título',
            tags,
            user_id: user?.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newAnnotation) {
          navigate(`/teacher/annotation/${newAnnotation.id}`, { replace: true });
        }
      }

      setIsEditMode(false);
      setShowPreview(false);
      setValidationErrors([]);
      
      toast.success("Salvo com sucesso", {
        description: "Suas alterações foram salvas.",
      });

    } catch (error) {
      console.error('Error saving structured edits:', error);
      toast.error("Erro ao salvar", {
        description: error instanceof Error ? error.message : "Não foi possível salvar as alterações.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcuts for edit mode
  useKeyboardShortcuts(getAnnotationEditorShortcuts({
    onSave: handleSaveStructuredEdits,
    onTogglePreview: handleTogglePreview,
    onInsertCalloutInfo: () => handleInsertMarker('[CALLOUT-INFO]\nSeu texto aqui\n[/CALLOUT-INFO]'),
    onInsertCalloutWarning: () => handleInsertMarker('[CALLOUT-WARNING]\nSeu texto aqui\n[/CALLOUT-WARNING]'),
    onInsertDiagram: () => handleInsertMarker('[DIAGRAM-MERMAID]\ngraph TD\n  A[Início] --> B[Fim]\n[/DIAGRAM-MERMAID]'),
    onShowHelp: () => setShowShortcutsHelp(true),
  }), isEditMode);

  const handleSave = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    let finalTitle = title?.trim() || '';
    
    if (!finalTitle && content && content.trim()) {
      await generateTitleWithAI();
      finalTitle = title?.trim() || '';
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

    let finalTitle = title?.trim() || '';
    
    if (!finalTitle && content && content.trim()) {
      await generateTitleWithAI();
      finalTitle = title?.trim() || '';
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
      navigate('/teacher/annotations');
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error('Erro ao salvar anotação');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIAction = async (actionType: string) => {
    if (!content || !content.trim()) {
      toast.error('Escreva conteúdo antes de usar a IA');
      return;
    }

    const currentContent = editorRef.current?.innerHTML || '';
    console.log('[AI Action] 💾 Salvando estado antes de processar:', actionType);
    console.log('[AI Action] Conteúdo atual (primeiros 100 chars):', currentContent.substring(0, 100));
    setPreAIContent(currentContent);
    
    // Se ainda não temos originalInputContent, salvar agora
    if (!originalInputContent) {
      setOriginalInputContent(currentContent);
      console.log('[AI Action] ✅ originalInputContent salvo pela primeira vez');
    }
    
    setIsProcessingAI(true);
    
    // Toast de progresso para atividades avaliativas
    let progressToastId: string | number | undefined;
    if (actionType === 'generate_activity') {
      progressToastId = toast.loading('Gerando atividade avaliativa...', {
        description: 'Etapa 1/3: Analisando conteúdo e criando questões contextualizadas',
        duration: Infinity,
      });
      
      setTimeout(() => {
        if (progressToastId) {
          toast.loading('Gerando atividade avaliativa...', {
            id: progressToastId,
            description: 'Etapa 2/3: Criando gabaritos e rubricas de avaliação',
          });
        }
      }, 20000);
      
      setTimeout(() => {
        if (progressToastId) {
          toast.loading('Gerando atividade avaliativa...', {
            id: progressToastId,
            description: 'Etapa 3/3: Finalizando e validando estrutura',
          });
        }
      }, 40000);
    }
    
    try {
      // Lógica especial para "Gerar Plano de Aula"
    if (actionType === 'format_lesson_plan') {
      try {
        toast.info('Gerando plano de aula... 📚', {
          description: 'Aguarde 60-90 segundos',
          duration: 5000,
        });

        const { data, error } = await supabase.functions.invoke('generate-lesson-plan', {
          body: { content }
        });

        if (error) {
          console.error('[Plano de Aula] Erro:', error);
          toast.error('Erro ao gerar plano de aula');
          setIsProcessingAI(false);
          return;
        }

        // ⭐ VALIDAÇÃO ROBUSTA DA RESPOSTA
        if (!data || !data.structured_content) {
          console.error('[Plano de Aula] Resposta inválida:', data);
          toast.error('Erro: Resposta vazia do servidor', {
            description: 'Tente novamente ou entre em contato com suporte',
          });
          setIsProcessingAI(false);
          return;
        }

        const structuredData = data.structured_content;

        // ⭐ VALIDAR CONTEÚDO
        if (!structuredData.conteudo || !Array.isArray(structuredData.conteudo)) {
          console.error('[Plano de Aula] Estrutura inválida:', structuredData);
          toast.error('Erro: Plano de aula vazio', {
            description: 'O servidor retornou uma estrutura inválida. Verifique os logs.',
          });
          setIsProcessingAI(false);
          return;
        }

        if (structuredData.conteudo.length === 0) {
          console.warn('[Plano de Aula] Plano gerado sem blocos');
          toast.warning('Plano de aula gerado sem blocos 🤔', {
            description: 'O conteúdo pode não ter sido suficiente. Tente adicionar mais detalhes.',
            duration: 7000,
          });
          setIsProcessingAI(false);
          return;
        }
        
        const jsonContent = JSON.stringify(structuredData);
        
        setContent(jsonContent);
        setStructuredContent(structuredData);
        setIsStructuredMode(true);
        
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
        
        saveToHistory(jsonContent);
        
        toast.success('Plano de aula gerado! 🎓', {
          description: `${structuredData.conteudo.length} blocos pedagógicos criados`,
          duration: 5000,
        });
        setIsProcessingAI(false);
        
      } catch (error) {
        console.error('[Plano de Aula] Erro:', error);
        toast.error('Erro ao gerar plano de aula');
        setIsProcessingAI(false);
      }
      return;
    }
      
      // Para outras ações, usar a edge function padrão com timeout de segurança
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout
      
      // Determinar qual função chamar baseado no actionType
      const functionName = actionType === 'generate_activity' 
        ? 'teacher-generate-activity' 
        : 'teacher-ai-text-formatting';

      console.log(`[AI Action] Chamando função: ${functionName} (action: ${actionType})`);

      let data, error;
      try {
        const response = await supabase.functions.invoke(functionName, {
          body: actionType === 'generate_activity'
            ? { content } // Nova função só precisa de content
            : { content, action: actionType }, // Função antiga precisa de action
          // @ts-ignore - AbortSignal is supported but not in types
          signal: controller.signal
        });
        data = response.data;
        error = response.error;
        clearTimeout(timeoutId);

        // Log de sucesso específico por função
        if (!error) {
          console.log(`[AI Action] ✅ ${functionName} retornou resposta de ${data?.formattedText?.length || 0} caracteres`);
        }
      } catch (invokeError: any) {
        clearTimeout(timeoutId);
        if (invokeError.name === 'AbortError') {
          throw new Error('Timeout: A geração demorou mais de 2 minutos. Tente com um texto menor ou mais conciso.');
        }
        throw invokeError;
      }

      if (error) throw error;
      
      if (data?.formattedText) {
        // Detectar se é JSON estruturado (Designer Instrucional ou Atividade Avaliativa)
        let jsonString = data.formattedText.trim();
        
        // Remover blocos de código markdown se presentes
        if (jsonString.startsWith('```json')) {
          jsonString = jsonString.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
        } else if (jsonString.startsWith('```')) {
          jsonString = jsonString.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
        }
        
        // Tentar extrair JSON de texto misto (procurar primeiro { até último })
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
          jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }
        
        // Verificar se é improve_didactic ou generate_activity e tentar parsear JSON estruturado
        if (actionType === 'improve_didactic' || actionType === 'generate_activity') {
          console.log(`[${actionType}] Iniciando parsing JSON...`);
          console.log(`[${actionType}] JSON recebido (primeiros 200 chars):`, jsonString.substring(0, 200));
          console.log(`[${actionType}] JSON recebido (últimos 200 chars):`, jsonString.substring(jsonString.length - 200));
          
          try {
            const parsedContent = JSON.parse(jsonString);
            
            // Validação rigorosa da estrutura
            if (!parsedContent || typeof parsedContent !== 'object') {
              throw new Error('JSON não é um objeto válido');
            }
            
            if (!parsedContent.conteudo || !Array.isArray(parsedContent.conteudo)) {
              console.error(`[${actionType}] ❌ Estrutura inválida. Esperado: { conteudo: [...] }`);
              console.error(`[${actionType}] Recebido:`, parsedContent);
              throw new Error('JSON não possui array "conteudo"');
            }
            
            if (parsedContent.conteudo.length === 0) {
              console.warn(`[${actionType}] ⚠️ Array "conteudo" está vazio`);
              throw new Error('Nenhum bloco de conteúdo gerado');
            }
            
            // ✅ TUDO OK - Aplicar modo estruturado
            console.log(`[${actionType}] ✅ ${parsedContent.conteudo.length} blocos detectados`);
            console.log(`[${actionType}] Tipos de blocos:`, parsedContent.conteudo.map((b: any) => b.tipo).join(', '));
            
            // Check for removed diagrams and show warning
            const removedDiagrams = parsedContent.conteudo.filter((b: any) => 
              b.tipo === 'paragrafo' && 
              (b.texto?.includes('Diagrama removido') || b.texto?.includes('diagrama removido'))
            ).length;
            
            const jsonContent = JSON.stringify(parsedContent);
            
            // IMPORTANTE: Definir estados na ordem correta
            setStructuredContent(parsedContent); // 1. Definir dados
            setIsStructuredMode(true);            // 2. Ativar modo
            setContent(jsonContent);              // 3. Salvar JSON string
            
            // CRÍTICO: Limpar editor HTML completamente
            if (editorRef.current) {
              editorRef.current.innerHTML = '';
              editorRef.current.blur(); // Remover foco do editor
            }
            
            saveToHistory(jsonContent);
            
            // Limpar toast de progresso se existir
            if (progressToastId) {
              toast.dismiss(progressToastId);
            }
            
            // Show warning if diagrams were removed
            if (removedDiagrams > 0) {
              toast.warning(`⚠️ ${removedDiagrams} diagrama(s) removido(s) por conter erros`, {
                description: 'Diagramas com sintaxe inválida foram substituídos por texto. O restante do conteúdo foi gerado normalmente.',
                duration: 8000,
              });
            }
            
            // Toast específico para cada tipo
            if (actionType === 'generate_activity') {
              const questoesObjetivas = parsedContent.conteudo.filter((b: any) => b.tipo === 'questao_multipla_escolha').length;
              const questoesAbertas = parsedContent.conteudo.filter((b: any) => b.tipo === 'questao_aberta').length;
              
              toast.success('✅ Atividade Avaliativa gerada com sucesso!', {
                description: `${questoesObjetivas} questões objetivas + ${questoesAbertas} questões abertas`,
                duration: 6000,
              });
            } else {
              toast.success('✅ Material didático gerado com sucesso!', {
                description: `${parsedContent.conteudo.length} blocos pedagógicos criados`,
                duration: 6000,
              });
            }
            
            setIsProcessingAI(false);
            return; // ✅ IMPORTANTE: Return early para não continuar com lógica HTML
            
          } catch (jsonError: any) {
            console.error(`[${actionType}] ❌ Erro ao parsear JSON:`, jsonError.message);
            console.error(`[${actionType}] JSON problemático (primeiros 500 chars):`, jsonString.substring(0, 500));
            
            toast.error('Erro ao processar conteúdo gerado', {
              description: 'O formato retornado pela IA está incorreto. Tente novamente.',
              duration: 8000,
            });
            
            setIsProcessingAI(false);
            return; // Não continuar com HTML
          }
        }
        
        // Se não for JSON estruturado ou não for improve_didactic, usar HTML normal
        setContent(data.formattedText);
        if (editorRef.current) {
          editorRef.current.innerHTML = data.formattedText;
        }
        saveToHistory(data.formattedText);
        toast.success('Texto formatado com sucesso!');
      }
      
      if (data?.suggestions) {
        toast.info(`Sugestões: ${data.suggestions}`, {
          duration: 8000,
        });
      }
      
      setIsProcessingAI(false);
      
      // Se não for conteúdo estruturado, mas foi formatação de IA
      if (actionType !== 'improve_didactic' && actionType !== 'format_lesson_plan') {
        setLastAIFormattedContent(data.formattedText);
        setShowPDFExportButton(true);
        
        // Auto-esconder após 30 segundos
        setTimeout(() => setShowPDFExportButton(false), 30000);
      }
      
    } catch (error: any) {
      console.error('Error processing with AI:', error);
      
      // Mensagens específicas baseadas no tipo de erro
      if (error?.message?.includes('formattedText')) {
        toast.error('Erro ao processar: formato de resposta inválido');
      } else if (error?.message?.includes('429')) {
        toast.error('Limite de requisições atingido. Tente novamente em instantes.');
      } else if (error?.message?.includes('402')) {
        toast.error('Créditos esgotados. Contate o administrador.');
      } else {
        toast.error('Erro ao processar com IA. Tente novamente.');
      }
      
      setIsProcessingAI(false);
    }
  };

  const generateTitleWithAI = async () => {
    if (!content || !content.trim()) {
      toast.error('Escreva conteúdo antes de gerar o título');
      return;
    }

    setIsGeneratingTitle(true);
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainTextContent = tempDiv.textContent || tempDiv.innerText || '';
      
      const { data, error } = await supabase.functions.invoke('generate-teacher-annotation-title', {
        body: { content: plainTextContent }
      });

      if (error) throw error;
      
      if (data?.title) {
        setTitle(data.title);
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
    if (!content || !content.trim()) {
      toast.error('Escreva conteúdo antes de gerar tags');
      return;
    }

    setIsGeneratingTags(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-teacher-annotation-tags', {
        body: { 
          content,
          title: title || 'Sem título'
        }
      });

      if (error) throw error;
      
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

  const handleHighlight = (color?: string) => {
    const colorToUse = color || highlightColor;
    executeCommand('hiliteColor', colorToUse);
    if (color) setHighlightColor(color);
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo: 5MB');
        return;
      }

      setIsUploadingImage(true);
      
      try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `annotation-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('annotation-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('annotation-images')
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          throw new Error('Falha ao obter URL da imagem');
        }

        // Insert image into editor
        const imgHtml = `<img src="${urlData.publicUrl}" alt="Imagem carregada" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />`;
        executeCommand('insertHTML', imgHtml);
        
        toast.success('Imagem inserida com sucesso!');
      } catch (error: any) {
        console.error('Error uploading image:', error);
        toast.error('Erro ao carregar imagem: ' + (error.message || 'Erro desconhecido'));
      } finally {
        setIsUploadingImage(false);
      }
    };
    
    input.click();
  };

  const handleAddTextbox = (color?: string) => {
    const colorToUse = color || postItColor;
    
    // Post-it color palettes
    const colors = {
      '#fef08a': { bg: '#fef08a', border: '#fbbf24', shadow: 'rgba(251, 191, 36, 0.3)' }, // Yellow
      '#fbcfe8': { bg: '#fbcfe8', border: '#ec4899', shadow: 'rgba(236, 72, 153, 0.3)' }, // Pink
      '#86efac': { bg: '#86efac', border: '#22c55e', shadow: 'rgba(34, 197, 94, 0.3)' }, // Green
      '#93c5fd': { bg: '#93c5fd', border: '#3b82f6', shadow: 'rgba(59, 130, 246, 0.3)' }  // Blue
    };
    
    const selectedColor = colors[colorToUse as keyof typeof colors] || colors['#fef08a'];
    
    const textboxHtml = `
      <div contenteditable="true" style="
        background: ${selectedColor.bg};
        border: 2px solid ${selectedColor.border};
        border-radius: 12px;
        padding: 16px;
        margin: 16px 0;
        min-height: 80px;
        box-shadow: 0 4px 12px ${selectedColor.shadow}, 0 2px 4px rgba(0,0,0,0.08);
        font-family: 'Comic Sans MS', 'Segoe Print', cursive;
        font-size: 15px;
        line-height: 1.6;
        position: relative;
        transform: rotate(-1deg);
        transition: transform 0.2s;
      " onmouseover="this.style.transform='rotate(0deg) scale(1.02)'" onmouseout="this.style.transform='rotate(-1deg)'">
        <p style="margin: 0; color: #1f2937;">Clique para editar este post-it...</p>
      </div>
    `;
    
    executeCommand('insertHTML', textboxHtml);
    if (color) setPostItColor(color);
    toast.success('Post-it adicionado!');
  };

  const handleExportPDF = async () => {
    if (!isStructuredMode || !structuredContent) {
      toast.error('Nenhum conteúdo estruturado disponível para exportar');
      return;
    }

    try {
      toast.info('📸 Capturando elementos visuais e gerando PDF otimizado...', { duration: 3000 });
      
      console.log('🎯 Iniciando geração visual de PDF...');
      console.log('📄 Blocos a processar:', structuredContent.conteudo.length);
      
      const result = await generateVisualPDF({
        structuredData: structuredContent,
        title: title || structuredContent.titulo_geral || 'Material Didático',
        logoSvg: '',
      });
      
      if (result.success) {
        let description = "✅ Material exportado com renderização visual completa!";
        
        if (result.stats) {
          description += `\n\n📊 Estatísticas:\n`;
          description += `• Elementos capturados como imagem: ${result.stats.imagesCaptured}\n`;
          description += `• Elementos em texto nativo: ${result.stats.nativeTextBlocks}\n`;
          description += `• Diagramas Mermaid: ${result.stats.mermaidDiagrams}\n`;
          description += `• Gráficos: ${result.stats.charts}\n`;
          description += `• Post-its: ${result.stats.postIts}\n`;
          description += `• Páginas geradas: ${result.stats.totalPages}\n`;
          description += `• Tempo de captura: ${(result.stats.captureTime / 1000).toFixed(1)}s`;
        }
        
        if (result.warnings && result.warnings.length > 0) {
          description += `\n\n⚠️ Avisos:\n${result.warnings.map(w => `• ${w}`).join('\n')}`;
        }
        
        toast.success("✅ PDF Visual Gerado!", {
          description,
          duration: 6000
        });
      } else {
        toast.error("❌ Erro ao Gerar PDF Visual", {
          description: result.error || "Erro desconhecido ao capturar elementos visuais",
          duration: 8000
        });
      }
    } catch (error: any) {
      console.error('❌ [TeacherAnnotation] Erro ao gerar PDF:', error);
      
      toast.error(
        '❌ Erro ao Gerar PDF Visual',
        {
          description: error?.message || 'Erro desconhecido. Tente novamente.'
        }
      );
    }
  };

  const handleExportHTMLToPDF = async () => {
    if (!editorRef.current) {
      toast.error('Nenhum conteúdo disponível para exportar');
      return;
    }

    try {
      toast.info('Gerando PDF...', { duration: 2000 });
      
      // Extrair texto do HTML
      const htmlContent = editorRef.current.innerHTML;
      
      // Converter HTML para Markdown simplificado
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      console.log('🎯 Iniciando geração de PDF do conteúdo formatado...');
      console.log('📄 Conteúdo:', textContent.substring(0, 200) + '...');
      console.log('📏 Tamanho do conteúdo:', textContent.length, 'caracteres');
      
      const result = await generateReportPDF({
        content: textContent,
        title: title || 'Anotação Formatada',
        logoSvg: '',
      });
      
      if (result.success) {
        let description = "A anotação foi exportada como PDF.";
        
        if (result.fixesApplied && result.fixesApplied.length > 0) {
          description = "✅ PDF gerado com sucesso após correções automáticas!\n\n";
          description += `🔧 Correções aplicadas:\n${result.fixesApplied.map(f => `• ${f}`).join('\n')}`;
        }
        
        if (result.stats) {
          description += `\n\n📊 Estatísticas:\n`;
          description += `• PDF: ${result.stats.pdf.pageCount} páginas geradas`;
        }
        
        toast.success(
          result.fixesApplied ? "✅ PDF Gerado (Auto-Corrigido)" : "✅ PDF Gerado com Sucesso",
          { description, duration: 5000 }
        );
        
        setShowPDFExportButton(false);
      } else {
        toast.error("❌ Erro ao Gerar PDF", {
          description: result.error || "Erro desconhecido",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF', {
        description: (error as Error).message
      });
    }
  };

  const handleInput = () => {
    if (editorRef.current && !isUndoRedoAction) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      
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
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }

        if (editorRef.current) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            if (finalTranscript) {
              const textNode = document.createTextNode(finalTranscript);
              range.insertNode(textNode);
              
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              selection.removeAllRanges();
              selection.addRange(range);
              
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
    if (tagInput && tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (isLoadingAnnotation) {
    return (
      <MainLayout>
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
          <TeacherBackgroundRipple />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
            <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
          <div className="relative z-10 flex items-center justify-center min-h-screen">
            <div className="text-center bg-white/75 backdrop-blur-xl rounded-xl p-8 shadow-xl">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
              <p className="text-gray-700 font-medium">Carregando anotação...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        {/* Animated Background with Ripple Effect */}
        <TeacherBackgroundRipple />
        
        {/* Gradient Blobs for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="shadow-lg">
          <CardHeader className="space-y-4">
            {/* Back Button and Actions Row */}
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/teacher/annotations')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                >
                  <Redo className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleVoiceToggle}
                  className={cn(isRecording && "bg-red-100 text-red-600")}
                >
                  <Mic className="h-4 w-4" />
                  {isRecording && <span className="ml-1">Gravando...</span>}
                </Button>
                <Button 
                  onClick={handleSaveAndExit}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar e Sair
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Title Input Row */}
            <div className="flex gap-2">
              <Input
                placeholder="Título da anotação..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 text-lg font-semibold"
              />
              <Button
                variant="outline"
                onClick={generateTitleWithAI}
                disabled={isGeneratingTitle || !content.trim()}
              >
                {isGeneratingTitle ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Gerar Título
              </Button>
            </div>

            {/* Tags Row */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleAddTag} variant="outline" size="sm">
                  Adicionar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateTagsWithAI}
                  disabled={isGeneratingTags || !content.trim()}
                >
                  {isGeneratingTags ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {suggestedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        if (!tags.includes(tag)) {
                          setTags([...tags, tag]);
                          setSuggestedTags(suggestedTags.filter(t => t !== tag));
                        }
                      }}
                    >
                      + {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* AI Actions Row */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ações de IA
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Melhorar Texto</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAIAction('grammar')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Corrigir Gramática
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAIAction('clarity')}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Melhorar Clareza
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Gerar Conteúdo</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAIAction('expand')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Expandir Conteúdo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAIAction('summarize')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Resumir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Ferramentas Pedagógicas</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAIAction('lesson-plan')}>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Gerar Plano de Aula
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAIAction('activity')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Gerar Atividade
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAIAction('material')}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Gerar Material Didático
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Formatting Toolbar */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeCommand('bold')}
                title="Negrito"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeCommand('italic')}
                title="Itálico"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeCommand('underline')}
                title="Sublinhado"
              >
                <Underline className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHighlight()}
                title="Destacar"
              >
                <Highlighter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeCommand('insertUnorderedList')}
                title="Lista com marcadores"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeCommand('insertOrderedList')}
                title="Lista numerada"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                title="Adicionar imagem"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddTextbox()}
                title="Adicionar caixa de texto"
              >
                <Type className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Structured Content Display (View Mode) */}
            {isStructuredMode && structuredContent && !isEditMode && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Visualizando conteúdo estruturado</p>
                  <Button
                    variant="outline"
                    onClick={handleToggleEditMode}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar conteúdo
                  </Button>
                </div>
                <div className="bg-background rounded-lg border border-border p-6">
                  <StructuredContentRenderer structuredData={structuredContent} />
                </div>
              </div>
            )}

            {/* Structured Content Edit Mode (Plaintext with Markers) */}
            {isStructuredMode && isEditMode && (
              <div className="flex flex-col h-[calc(100vh-300px)]">
                <div className="flex items-center justify-between gap-2 p-4 bg-muted/30 border-b">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleToggleEditMode} disabled={isSaving} size="sm">
                      <X className="h-4 w-4 mr-2" />Cancelar
                    </Button>
                    <Button onClick={handleSaveStructuredEdits} disabled={isSaving || validationErrors.some(e => e.severity === 'error')} size="sm">
                      {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleTogglePreview}>
                      {showPreview ? <><EyeOff className="h-4 w-4 mr-2" />Ocultar</> : <><Eye className="h-4 w-4 mr-2" />Preview</>}
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowShortcutsHelp(true)}>
                    <HelpCircle className="h-4 w-4 mr-2" />Atalhos
                  </Button>
                </div>
                <MarkerToolbar onInsertMarker={handleInsertMarker} onInsertTemplate={handleInsertTemplate} isMobile={isMobile} />
                <div className="flex-1 flex overflow-hidden">
                  {showPreview ? (
                    <>
                      <div className="flex-1 border-r">
                        <SyntaxHighlightedEditor 
                          value={plaintextContent} 
                          onChange={(value) => {
                            setPlaintextContent(value);
                            savePlaintextToHistory(value);
                          }} 
                          validationErrors={validationErrors} 
                          className="h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <PreviewPanel 
                          structuredData={previewData} 
                          isLoading={isParsingPreview} 
                          className="h-full" 
                        />
                      </div>
                    </>
                  ) : (
                    <SyntaxHighlightedEditor 
                      value={plaintextContent} 
                      onChange={(value) => {
                        setPlaintextContent(value);
                        savePlaintextToHistory(value);
                      }} 
                      validationErrors={validationErrors} 
                      className="h-full"
                    />
                  )}
                </div>
                {validationErrors.length > 0 && (
                  <div className="border-t bg-muted/30 p-3 max-h-32 overflow-y-auto">
                    <div className="text-xs font-semibold mb-2">
                      {validationErrors.filter(e => e.severity === 'error').length} erros, {validationErrors.filter(e => e.severity === 'warning').length} avisos
                    </div>
                    <div className="space-y-1 text-xs">
                      {validationErrors.slice(0, 3).map((e, i) => (
                        <div key={i} className={cn("p-2 rounded", e.severity === 'error' ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700")}>
                          Linha {e.line}: {e.message}
                        </div>
                      ))}
                      {validationErrors.length > 3 && (
                        <div className="text-muted-foreground pt-1">
                          ... e mais {validationErrors.length - 3} problema(s)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Regular HTML Editor (non-structured content) */}
            {!isStructuredMode && (
              <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="min-h-[500px] p-6 border-2 border-border rounded-lg focus:outline-none focus:border-primary bg-background prose prose-lg max-w-none"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                }}
              />
            )}
          </CardContent>
        </Card>
        </div>

        {/* Floating PDF Export Button */}
        {showPDFExportButton && !isStructuredMode && (
          <div className="fixed bottom-32 right-8 z-30 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button
              onClick={handleExportHTMLToPDF}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-2xl border-0 px-6 py-6 rounded-2xl hover:scale-105 transition-all duration-300"
              size="lg"
            >
              <FileDown className="h-5 w-5 mr-2" />
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm">Exportar como PDF</span>
                <span className="text-xs opacity-90">Conteúdo formatado por IA</span>
              </div>
            </Button>
          </div>
        )}

        {/* Save Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Organizar Anotação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={generateTagsWithAI}
                    disabled={isGeneratingTags}
                    className="ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    {isGeneratingTags ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Gerando...</>
                    ) : (
                      <><Sparkles className="h-3 w-3 mr-1" />Gerar com IA</>
                    )}
                  </Button>
                </h4>
                
                {suggestedTags.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Sugestões da IA:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map(tag => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            if (!dialogTags.includes(tag)) {
                              setDialogTags([...dialogTags, tag]);
                            }
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar tag"
                    value={dialogTagInput}
                    onChange={(e) => setDialogTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (dialogTagInput && dialogTagInput.trim() && !dialogTags.includes(dialogTagInput.trim())) {
                          setDialogTags([...dialogTags, dialogTagInput.trim()]);
                          setDialogTagInput('');
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (dialogTagInput && dialogTagInput.trim() && !dialogTags.includes(dialogTagInput.trim())) {
                        setDialogTags([...dialogTags, dialogTagInput.trim()]);
                        setDialogTagInput('');
                      }
                    }}
                    size="sm"
                  >
                    Adicionar
                  </Button>
                </div>
                
                {dialogTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {dialogTags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setDialogTags(dialogTags.filter(t => t !== tag))}
                      >
                        {tag}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleFinalSave}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Salvar</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shortcuts Help Dialog */}
        <ShortcutsDialog 
          open={showShortcutsHelp} 
          onOpenChange={setShowShortcutsHelp} 
        />

        {/* Fixed Footer - Botões de ação no mobile */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t shadow-2xl pb-safe">
            <div className="container mx-auto px-4 py-3">
              <div className="flex gap-2">
                {isStructuredMode && structuredContent && (
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-md h-12"
                  >
                    <FileDown className="h-5 w-5 mr-2" />
                    Exportar PDF
                  </Button>
                )}
                <Button
                  onClick={handleSaveAndExit}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg h-12"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="h-5 w-5 mr-2" />Salvar e Sair</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default TeacherAnnotationPage;
