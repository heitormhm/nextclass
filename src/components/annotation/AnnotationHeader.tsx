/**
 * AnnotationHeader - Title and tag management
 * Responsive header for annotation editing
 */

import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AnnotationHeaderProps {
  title: string;
  setTitle: (title: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  onGenerateTitle: () => void;
  onGenerateTags: () => void;
  isGeneratingTitle: boolean;
  isGeneratingTags: boolean;
}

export const AnnotationHeader: React.FC<AnnotationHeaderProps> = ({
  title,
  setTitle,
  tags,
  setTags,
  onGenerateTitle,
  onGenerateTags,
  isGeneratingTitle,
  isGeneratingTags,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className={cn(
        'flex items-center gap-2',
        isMobile && 'flex-col sm:flex-row'
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/teacher/annotations')}
          className="shrink-0 h-10 w-10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da anotação"
          className={cn(
            'text-lg font-bold border-none focus-visible:ring-0 bg-transparent px-2',
            isMobile ? 'flex-1' : 'flex-1'
          )}
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerateTitle}
          disabled={isGeneratingTitle}
          className="shrink-0 h-10 w-10 hover:bg-blue-100 hover:text-blue-600"
          title="Gerar título com IA"
        >
          {isGeneratingTitle ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Tags Row */}
      <div className="flex flex-wrap items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
        
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 text-xs"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Adicionar tag..."
          className="h-7 w-32 text-xs border-dashed"
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerateTags}
          disabled={isGeneratingTags}
          className="h-7 px-2 text-xs"
        >
          {isGeneratingTags ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-1" />
              Sugerir tags
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
