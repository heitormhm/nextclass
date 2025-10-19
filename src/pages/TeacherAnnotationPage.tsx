import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Highlighter, List, ListOrdered, 
  ImagePlus, Type, Save, ArrowLeft, Tag, 
  Sparkles, X, Loader2, CheckCircle2, FileText, FileDown,
  Mic, Undo, Redo, BookOpen, Table as TableIcon, 
  Lightbulb, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { StructuredContentRenderer } from '@/components/StructuredContentRenderer';
import { generateVisualPDF } from '@/utils/visualPdfGenerator';
import { generateReportPDF } from '@/utils/pdfGenerator';
import { structuredContentToMarkdown } from '@/utils/structuredContentToMarkdown';

const TeacherAnnotationPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
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
  
  // Structured content state
  const [structuredContent, setStructuredContent] = useState<any>(null);
  const [isStructuredMode, setIsStructuredMode] = useState(false);
  
  // PDF Export state
  const [lastAIFormattedContent, setLastAIFormattedContent] = useState<string>('');
  const [showPDFExportButton, setShowPDFExportButton] = useState(false);
  
  // History state for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice transcription refs
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    
    const handleFirstInput = () => {
      const currentContent = editorRef.current?.innerHTML || '';
      if (currentContent.trim() && history.length === 0) {
        console.log('[History] Capturing first input:', currentContent.substring(0, 50));
        setHistory([currentContent]);
        setHistoryIndex(0);
        setHasInitializedHistory(true);
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
      setIsUndoRedoAction(true);
      const previousContent = history[historyIndex - 1];
      setContent(previousContent);
      
      // Try to parse as structured content
      try {
        const parsed = JSON.parse(previousContent);
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
            editorRef.current.innerHTML = previousContent;
            editorRef.current.scrollTop = scrollTop;
          }
        }
      } catch {
        // Not JSON, treat as HTML
        setStructuredContent(null);
        setIsStructuredMode(false);
        if (editorRef.current) {
          const scrollTop = editorRef.current.scrollTop;
          editorRef.current.innerHTML = previousContent;
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
      navigate('/teacher/annotations');
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error('Erro ao salvar anotação');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIAction = async (actionType: string) => {
    if (!content.trim()) {
      toast.error('Escreva conteúdo antes de usar a IA');
      return;
    }

    setIsProcessingAI(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('teacher-ai-text-formatting', {
        body: { 
          content, 
          action: actionType 
        }
      });

      if (error) throw error;
      
      if (data?.formattedText) {
        // Detectar se é JSON estruturado (Designer Instrucional)
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
        
        // Verificar se é improve_didactic e tentar parsear JSON estruturado
        if (actionType === 'improve_didactic') {
          try {
            const parsedContent = JSON.parse(jsonString);
            
            if (parsedContent.conteudo && Array.isArray(parsedContent.conteudo)) {
              console.log('[Structured Content] JSON válido detectado - SUBSTITUINDO conteúdo');
              
              // ✅ SUBSTITUIR completamente o conteúdo
              const jsonContent = JSON.stringify(parsedContent);
              setContent(jsonContent); // Salvar JSON como string
              setStructuredContent(parsedContent); // Definir objeto para renderização
              setIsStructuredMode(true); // Ativar modo estruturado
              
              // ✅ LIMPAR o editor HTML (não será mais usado)
              if (editorRef.current) {
                editorRef.current.innerHTML = '';
              }
              
              // Salvar no histórico
              saveToHistory(jsonContent);
              
              toast.success('Material didático gerado! 🎓', {
                description: `${parsedContent.conteudo.length} blocos pedagógicos criados`,
                duration: 5000,
              });
              setIsProcessingAI(false);
              return; // ✅ IMPORTANTE: Return early para não continuar com lógica HTML
            }
          } catch (jsonError) {
            console.log('[Structured Content] Não é JSON válido, continuando com HTML');
            // Não é JSON estruturado, continuar com lógica normal de HTML abaixo
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
      if (actionType !== 'improve_didactic') {
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
    if (!content.trim()) {
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
    if (!content.trim()) {
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
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
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
          <BackgroundRippleEffect className="opacity-30" />
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
        <BackgroundRippleEffect className="opacity-30" />
        
        {/* Gradient Blobs for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute top-2/3 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/25 to-purple-400/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Fixed Header - Teacher Theme */}
        <div className="relative z-20 sticky top-0 bg-white/90 backdrop-blur-xl border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/teacher/annotations')}
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
                  className="shrink-0 hover:bg-blue-100 hover:text-blue-600"
                >
                  {isGeneratingTitle ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  )}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveAndExit}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Salvar e Sair</>
                  )}
                </Button>
                {isStructuredMode && (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleExportPDF}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar como PDF
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 py-6">
          <div className="max-w-5xl mx-auto">
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-xl">
              <CardContent className="p-8">
                {isStructuredMode && structuredContent ? (
                  <div className="structured-content-wrapper">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-900">Modo de Visualização Pedagógica</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Exportar como PDF
                      </Button>
                    </div>
                    <div className="min-h-[700px] max-h-[700px] overflow-y-auto p-8 rounded-lg bg-gradient-to-br from-purple-50/50 to-blue-50/50">
                      <StructuredContentRenderer structuredData={structuredContent} />
                    </div>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Toolbar */}
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

        {/* Floating AI Assistant Button - Teacher Theme */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 z-40"
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
            <DropdownMenuLabel className="text-blue-600 font-semibold flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5" />
              Assistente IA Mia
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleAIAction('improve_grammar')} className="cursor-pointer py-3">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              <span className="font-medium">Corrigir erros gramaticais</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-2" />
            
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
            
            <DropdownMenuLabel className="text-xs font-bold text-gray-600 uppercase tracking-wider px-2 py-1">
              ✨ Melhorias Didáticas
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleAIAction('improve_didactic')} className="cursor-pointer pl-6 py-2">
              <GraduationCap className="h-4 w-4 mr-2 text-purple-600" />
              <div className="flex flex-col">
                <span className="font-medium">Tornar mais Didático</span>
                <span className="text-xs text-muted-foreground">Adicione exemplos e simplificações</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('expand')} className="cursor-pointer pl-6 py-2">
              <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
              <span className="font-medium">Expandir conteúdo</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('summarize')} className="cursor-pointer pl-6 py-2">
              <FileText className="h-4 w-4 mr-2 text-gray-600" />
              <span className="font-medium">Resumir conteúdo</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-2" />
            
            <DropdownMenuLabel className="text-xs font-bold text-gray-600 uppercase tracking-wider px-2 py-1">
              🎓 Ferramentas Pedagógicas
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleAIAction('format_lesson_plan')} className="cursor-pointer pl-6 py-2">
              <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
              <div className="flex flex-col">
                <span className="font-medium">Formatar como Plano de Aula</span>
                <span className="text-xs text-muted-foreground">Estrutura pedagógica completa</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('create_rubric')} className="cursor-pointer pl-6 py-2">
              <TableIcon className="h-4 w-4 mr-2 text-green-600" />
              <div className="flex flex-col">
                <span className="font-medium">Criar Rubrica de Avaliação</span>
                <span className="text-xs text-muted-foreground">Tabela de critérios e níveis</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIAction('generate_activity')} className="cursor-pointer pl-6 py-2">
              <Lightbulb className="h-4 w-4 mr-2 text-orange-600" />
              <div className="flex flex-col">
                <span className="font-medium">Gerar Roteiro de Atividade</span>
                <span className="text-xs text-muted-foreground">Passo a passo prático</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
                        if (dialogTagInput.trim() && !dialogTags.includes(dialogTagInput.trim())) {
                          setDialogTags([...dialogTags, dialogTagInput.trim()]);
                          setDialogTagInput('');
                        }
                      }
                    }}
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
      </div>
    </MainLayout>
  );
};

export default TeacherAnnotationPage;
