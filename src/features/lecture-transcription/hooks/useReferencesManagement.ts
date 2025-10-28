import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ReferenceService } from '../services/referenceService';
import { Reference, ReferenceType } from '../types/reference.types';
import { StructuredContent } from '../types/lecture.types';

export const useReferencesManagement = (
  lectureId: string | undefined,
  structuredContent: StructuredContent | null,
  onContentUpdate: (content: StructuredContent) => void
) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newReference, setNewReference] = useState<Reference>({
    titulo: '',
    url: '',
    tipo: 'site'
  });
  const [editingReference, setEditingReference] = useState<Reference | null>(null);
  const { toast } = useToast();

  const addReference = async () => {
    if (!newReference.titulo.trim() || !newReference.url.trim()) {
      toast({ variant: 'destructive', title: 'Preencha todos os campos' });
      return;
    }

    if (!ReferenceService.isValidUrl(newReference.url)) {
      toast({ variant: 'destructive', title: 'URL inválida' });
      return;
    }

    if (!lectureId || !structuredContent) return;

    try {
      const updatedRefs = [...(structuredContent.referencias_externas || []), newReference] as Reference[];
      await ReferenceService.updateReferences(lectureId, structuredContent, updatedRefs);
      
      onContentUpdate({ ...structuredContent, referencias_externas: updatedRefs as any });
      setIsAdding(false);
      setNewReference({ titulo: '', url: '', tipo: 'site' });
      toast({ title: '✅ Referência adicionada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar referência' });
    }
  };

  const editReference = async () => {
    if (editingIndex === null || !editingReference || !lectureId || !structuredContent) return;

    try {
      const updatedRefs = [...(structuredContent.referencias_externas || [])] as Reference[];
      updatedRefs[editingIndex] = editingReference;
      await ReferenceService.updateReferences(lectureId, structuredContent, updatedRefs);
      
      onContentUpdate({ ...structuredContent, referencias_externas: updatedRefs as any });
      setEditingIndex(null);
      setEditingReference(null);
      toast({ title: '✅ Referência editada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao editar referência' });
    }
  };

  const deleteReference = async (index: number) => {
    if (!window.confirm('Tem certeza que deseja deletar esta referência?')) return;
    if (!lectureId || !structuredContent) return;

    try {
      const updatedRefs = (structuredContent.referencias_externas || []).filter((_, i) => i !== index) as Reference[];
      await ReferenceService.updateReferences(lectureId, structuredContent, updatedRefs);
      
      onContentUpdate({ ...structuredContent, referencias_externas: updatedRefs as any });
      toast({ title: '✅ Referência deletada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao deletar referência' });
    }
  };

  return {
    isAdding,
    setIsAdding,
    editingIndex,
    setEditingIndex,
    newReference,
    setNewReference,
    editingReference,
    setEditingReference,
    addReference,
    editReference,
    deleteReference
  };
};
