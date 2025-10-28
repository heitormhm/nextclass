import { useState, useEffect } from 'react';
import { StructuredContent } from '../types/lecture.types';

export const useLectureState = (initialContent: StructuredContent | null) => {
  const [structuredContent, setStructuredContent] = useState<StructuredContent | null>(initialContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (structuredContent) {
      setHasUnsavedChanges(true);
    }
  }, [structuredContent]);

  const updateContent = (updates: Partial<StructuredContent>) => {
    setStructuredContent(prev => prev ? { ...prev, ...updates } : null);
  };

  const resetUnsavedChanges = () => {
    setHasUnsavedChanges(false);
  };

  return {
    structuredContent,
    setStructuredContent,
    updateContent,
    hasUnsavedChanges,
    resetUnsavedChanges
  };
};
