/**
 * TeacherAnnotationPage - Refactored with Tiptap
 * Modular architecture with custom hooks and components
 * ~200 lines vs 2,130 lines original
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Modular components and hooks
import { PedagogicalEditor } from '@/components/annotation/PedagogicalEditor';
import { AnnotationHeader } from '@/components/annotation/AnnotationHeader';
import { EditorToolbar } from '@/components/annotation/EditorToolbar';
import { PostItManager } from '@/components/annotation/PostItManager';
import { useAnnotation } from '@/hooks/useAnnotation';
import { useAnnotationAI } from '@/hooks/useAnnotationAI';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { postItPluginKey, type PostIt } from '@/tiptap/plugins/postItPlugin';

const TeacherAnnotationPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // State
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editor, setEditor] = useState<any>(null);
  const [postIts, setPostIts] = useState<PostIt[]>([]);

  // Custom hooks
  const { annotation, isLoading, isSaving, saveAnnotation } = useAnnotation(id);
  const aiHooks = useAnnotationAI(editor);
  const voiceHooks = useVoiceInput(editor);

  // Load annotation data
  useEffect(() => {
    if (annotation) {
      setTitle(annotation.title);
      setContent(annotation.content);
      setTags(annotation.tags || []);
    } else if (location.state?.prePopulatedContent) {
      setContent(location.state.prePopulatedContent);
      setTitle(location.state.prePopulatedTitle || '');
    }
  }, [annotation, location.state]);

  // Sync post-its from editor plugin state
  useEffect(() => {
    if (!editor) return;

    const updatePostIts = () => {
      const pluginState = postItPluginKey.getState(editor.state);
      if (pluginState) {
        setPostIts(pluginState.postIts);
      }
    };

    // Initial load
    updatePostIts();

    // Listen for updates
    editor.on('transaction', updatePostIts);

    return () => {
      editor.off('transaction', updatePostIts);
    };
  }, [editor]);

  // Handle AI actions
  const handleAIAction = async (action: string) => {
    switch (action) {
      case 'grammar':
        await aiHooks.correctGrammar();
        break;
      case 'expand':
        await aiHooks.expandContent();
        break;
      case 'summarize':
        await aiHooks.summarizeContent();
        break;
      case 'lesson_plan':
        const lessonPlan = await aiHooks.generateLessonPlan();
        if (lessonPlan) {
          // Open in new window or modal
          console.log('Lesson plan generated:', lessonPlan);
        }
        break;
      case 'activity':
        const activity = await aiHooks.generateActivity();
        if (activity) {
          console.log('Activity generated:', activity);
        }
        break;
    }
  };

  // Generate title with AI
  const handleGenerateTitle = async () => {
    if (!content) {
      toast.error('Escreva algum conteúdo primeiro');
      return;
    }
    const generated = await aiHooks.generateTitle(content);
    if (generated) {
      setTitle(generated);
    }
  };

  // Generate tags with AI
  const handleGenerateTags = async () => {
    if (!content || !title) {
      toast.error('Adicione título e conteúdo primeiro');
      return;
    }
    const generated = await aiHooks.generateTags(content, title);
    if (generated.length > 0) {
      setTags(generated);
    }
  };

  // Save annotation
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Adicione um título à anotação');
      return;
    }

    if (!content.trim()) {
      toast.error('A anotação está vazia');
      return;
    }

    const saved = await saveAnnotation({
      title,
      content,
      tags,
      source_type: location.state?.sourceType,
      source_id: location.state?.sourceId,
    });

    if (saved) {
      if (id) {
        toast.success('Anotação atualizada!');
      } else {
        toast.success('Anotação criada!');
        navigate(`/teacher/annotation/${saved.id}`, { replace: true });
      }
    }
  };

  // Save and exit
  const handleSaveAndExit = async () => {
    await handleSave();
    navigate('/teacher/annotations');
  };

  // Export PDF
  const handleExportPDF = async () => {
    if (!title || !content) {
      toast.error('Adicione título e conteúdo para exportar');
      return;
    }

    try {
      // Create a temporary div to render content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      tempDiv.style.cssText = 'position: absolute; left: -9999px; width: 800px;';
      document.body.appendChild(tempDiv);

      // Use html2canvas to capture the content
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(tempDiv);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`${title || 'anotacao'}.pdf`);

      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  // Handle post-it operations
  const handleUpdatePostIt = (id: string, content: string) => {
    if (!editor) return;
    const tr = editor.state.tr.setMeta('postItPlugin', {
      action: 'update',
      id,
      updates: { content },
    });
    editor.view.dispatch(tr);
  };

  const handleDeletePostIt = (id: string) => {
    if (!editor) return;
    
    // Remove the post-it
    const tr = editor.state.tr.setMeta('postItPlugin', {
      action: 'remove',
      id,
    });
    editor.view.dispatch(tr);
    
    // Also remove the comment highlight mark if it exists
    const { doc } = editor.state;
    let tr2 = editor.state.tr;
    
    doc.descendants((node, pos) => {
      node.marks.forEach((mark) => {
        if (mark.type.name === 'commentHighlight' && mark.attrs.commentId === id) {
          tr2 = tr2.removeMark(pos, pos + node.nodeSize, mark.type);
        }
      });
    });
    
    if (tr2.steps.length > 0) {
      editor.view.dispatch(tr2);
    }

    toast.success('Comentário excluído');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando anotação...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <TeacherBackgroundRipple className="fixed inset-0 pointer-events-none" />

        <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
          <Card className="bg-white/95 backdrop-blur-xl shadow-xl">
            <CardContent className="p-6 space-y-6">
              {/* Header with title and tags */}
              <AnnotationHeader
                title={title}
                setTitle={setTitle}
                tags={tags}
                setTags={setTags}
                onGenerateTitle={handleGenerateTitle}
                onGenerateTags={handleGenerateTags}
                isGeneratingTitle={aiHooks.isGeneratingTitle}
                isGeneratingTags={aiHooks.isGeneratingTags}
              />

              {/* Editor Toolbar */}
              <EditorToolbar
                editor={editor}
                isListening={voiceHooks.isListening}
                onToggleVoice={voiceHooks.toggleListening}
                onSave={handleSave}
                onExportPDF={handleExportPDF}
                onAIAction={handleAIAction}
                isSaving={isSaving}
              />

              {/* Tiptap Editor */}
              <PedagogicalEditor
                content={content}
                onChange={setContent}
                editable={true}
                onEditorReady={setEditor}
                className="min-h-[500px]"
              />
            </CardContent>
          </Card>
          
          {/* Post-It Manager - Floating comments */}
          <PostItManager
            postIts={postIts}
            onUpdate={handleUpdatePostIt}
            onDelete={handleDeletePostIt}
          />
        </div>

        {/* Mobile Fixed Footer */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t shadow-2xl pb-safe">
            <div className="flex gap-2 p-3">
              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="flex-1 h-12"
              >
                Exportar PDF
              </Button>
              <Button
                onClick={handleSaveAndExit}
                disabled={isSaving}
                className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              >
                {isSaving ? 'Salvando...' : 'Salvar e Sair'}
              </Button>
            </div>
          </div>
        )}

        {/* Save Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar anotação</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Deseja salvar as alterações antes de sair?
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => navigate('/teacher/annotations')}>
                Sair sem salvar
              </Button>
              <Button onClick={handleSaveAndExit} disabled={isSaving}>
                Salvar e sair
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};
