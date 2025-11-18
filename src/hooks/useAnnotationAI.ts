/**
 * useAnnotationAI Hook - AI operations wrapper
 * Centralizes all AI-powered annotation features
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Editor } from '@tiptap/react';

export const useAnnotationAI = (editor: Editor | null) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  /**
   * Generate title from content
   */
  const generateTitle = async (content: string): Promise<string | null> => {
    if (!content || content.trim().length < 10) {
      toast.error('Conteúdo muito curto para gerar título');
      return null;
    }

    setIsGeneratingTitle(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-teacher-annotation-title',
        {
          body: { content },
        }
      );

      if (error) throw error;
      
      return data?.title || null;
    } catch (error: any) {
      console.error('Error generating title:', error);
      toast.error('Erro ao gerar título com IA');
      return null;
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  /**
   * Generate tags from content and title
   */
  const generateTags = async (content: string, title: string): Promise<string[]> => {
    if (!content || !title) {
      toast.error('Conteúdo e título são necessários');
      return [];
    }

    setIsGeneratingTags(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-teacher-annotation-tags',
        {
          body: { content, title },
        }
      );

      if (error) throw error;
      
      return data?.tags || [];
    } catch (error: any) {
      console.error('Error generating tags:', error);
      toast.error('Erro ao gerar tags com IA');
      return [];
    } finally {
      setIsGeneratingTags(false);
    }
  };

  /**
   * Grammar correction
   */
  const correctGrammar = async (): Promise<void> => {
    if (!editor) return;

    const content = editor.getText();
    if (!content) {
      toast.error('Editor está vazio');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'teacher-ai-text-formatting',
        {
          body: { 
            content: editor.getHTML(),
            action: 'grammar'
          },
        }
      );

      if (error) throw error;

      if (data?.formatted_content) {
        editor.commands.setContent(data.formatted_content);
        toast.success('Correção gramatical aplicada!');
      }
    } catch (error: any) {
      console.error('Error correcting grammar:', error);
      toast.error('Erro ao corrigir gramática');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Expand content
   */
  const expandContent = async (): Promise<void> => {
    if (!editor) return;

    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to);
    
    if (!selectedText) {
      toast.error('Selecione um texto para expandir');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'teacher-ai-text-formatting',
        {
          body: { 
            content: selectedText,
            action: 'expand'
          },
        }
      );

      if (error) throw error;

      if (data?.formatted_content) {
        editor.commands.insertContentAt(selection.to, data.formatted_content);
        toast.success('Conteúdo expandido com sucesso!');
      }
    } catch (error: any) {
      console.error('Error expanding content:', error);
      toast.error('Erro ao expandir conteúdo');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Summarize content
   */
  const summarizeContent = async (): Promise<void> => {
    if (!editor) return;

    const content = editor.getText();
    if (!content || content.length < 100) {
      toast.error('Conteúdo muito curto para resumir');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'teacher-ai-text-formatting',
        {
          body: { 
            content: editor.getHTML(),
            action: 'summarize'
          },
        }
      );

      if (error) throw error;

      if (data?.formatted_content) {
        // Insert summary as a callout box
        editor.commands.setCalloutBox({ type: 'info', title: 'Resumo' });
        editor.commands.insertContent(data.formatted_content);
        toast.success('Resumo criado com sucesso!');
      }
    } catch (error: any) {
      console.error('Error summarizing content:', error);
      toast.error('Erro ao resumir conteúdo');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Generate lesson plan
   */
  const generateLessonPlan = async (): Promise<string | null> => {
    if (!editor) return null;

    const content = editor.getText();
    if (!content) {
      toast.error('Editor está vazio');
      return null;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'teacher-generate-activity',
        {
          body: { 
            content: editor.getHTML(),
            activityType: 'lesson_plan'
          },
        }
      );

      if (error) throw error;

      toast.success('Plano de aula gerado com sucesso!');
      return data?.activity || null;
    } catch (error: any) {
      console.error('Error generating lesson plan:', error);
      toast.error('Erro ao gerar plano de aula');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Generate assessment activity
   */
  const generateActivity = async (): Promise<string | null> => {
    if (!editor) return null;

    const content = editor.getText();
    if (!content) {
      toast.error('Editor está vazio');
      return null;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'teacher-generate-activity',
        {
          body: { 
            content: editor.getHTML(),
            activityType: 'assessment'
          },
        }
      );

      if (error) throw error;

      toast.success('Atividade avaliativa gerada com sucesso!');
      return data?.activity || null;
    } catch (error: any) {
      console.error('Error generating activity:', error);
      toast.error('Erro ao gerar atividade');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    isGeneratingTitle,
    isGeneratingTags,
    generateTitle,
    generateTags,
    correctGrammar,
    expandContent,
    summarizeContent,
    generateLessonPlan,
    generateActivity,
  };
};
