/**
 * useAnnotation Hook - Data fetching and persistence
 * Handles CRUD operations for teacher annotations
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { convertLegacyToTiptap, isStructuredJSON } from '@/utils/annotation/legacyMigration';

export interface Annotation {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  source_type?: string;
  source_id?: string;
  created_at: string;
  updated_at: string;
}

export const useAnnotation = (annotationId?: string) => {
  const { user } = useAuth();
  const [annotation, setAnnotation] = useState<Annotation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load annotation
  useEffect(() => {
    if (annotationId && user) {
      loadAnnotation();
    }
  }, [annotationId, user]);

  const loadAnnotation = async () => {
    if (!annotationId || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('id', annotationId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Keep content as-is from database (as string)
      // PedagogicalEditor will handle format conversion
      setAnnotation(data);
    } catch (error: any) {
      console.error('Error loading annotation:', error);
      toast.error('Erro ao carregar anotação');
    } finally {
      setIsLoading(false);
    }
  };

  // Save annotation
  const saveAnnotation = async (data: {
    title: string;
    content: string;
    tags: string[];
    source_type?: string;
    source_id?: string;
  }) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    setIsSaving(true);
    try {
      if (annotationId) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('annotations')
          .update({
            title: data.title,
            content: data.content,
            tags: data.tags,
            updated_at: new Date().toISOString(),
          })
          .eq('id', annotationId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        
        setAnnotation(updated);
        toast.success('Anotação atualizada com sucesso!');
        return updated;
      } else {
        // Create new
        const { data: created, error } = await supabase
          .from('annotations')
          .insert({
            user_id: user.id,
            title: data.title,
            content: data.content,
            tags: data.tags,
            source_type: data.source_type,
            source_id: data.source_id,
          })
          .select()
          .single();

        if (error) throw error;

        setAnnotation(created);
        toast.success('Anotação criada com sucesso!');
        return created;
      }
    } catch (error: any) {
      console.error('Error saving annotation:', error);
      toast.error('Erro ao salvar anotação');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete annotation
  const deleteAnnotation = async () => {
    if (!annotationId || !user) return false;

    try {
      const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', annotationId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Anotação excluída com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Error deleting annotation:', error);
      toast.error('Erro ao excluir anotação');
      return false;
    }
  };

  return {
    annotation,
    isLoading,
    isSaving,
    loadAnnotation,
    saveAnnotation,
    deleteAnnotation,
  };
};
