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
    <div className="space-y-3 mb-4">
      {/* Title Section - Primary Focus Area */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/teacher/annotations')}
            className="shrink-0 h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg hover:bg-white/80 transition-all"
            aria-label="Return to Annotations"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da anotação"
            className="flex-1 text-base md:text-lg font-bold bg-white/80 rounded-lg px-4 py-2 border border-gray-200 focus-visible:ring-2 focus-visible:ring-purple-400 transition-all"
            autoFocus={!title}
          />

          <Button
            onClick={onGenerateTitle}
            disabled={isGeneratingTitle}
            className={cn(
              'shrink-0 h-11 px-4 rounded-lg transition-all',
              'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white',
              'hover:shadow-lg hover:scale-105',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Generate title with AI"
            title="Gerar título com IA"
          >
            {isGeneratingTitle ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {!isMobile && <span className="text-sm font-medium">Gerar</span>}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tags Section - Secondary Organization Area */}
      <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/30 p-4">
        {/* Tags Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">
              Tags {tags.length > 0 && <span className="text-gray-500">({tags.length})</span>}
            </span>
          </div>
          
          <Button
            onClick={onGenerateTags}
            disabled={isGeneratingTags}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-medium transition-all',
              'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white',
              'hover:shadow-lg hover:scale-105',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Suggest tags with AI"
            title="Sugerir tags relevantes"
          >
            {isGeneratingTags ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1.5" />
                Sugerir tags
              </>
            )}
          </Button>
        </div>

        {/* Existing Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <Badge
                key={tag}
                className="bg-purple-100 text-purple-700 border border-purple-200 gap-1.5 text-xs px-3 py-1 animate-fade-in"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-red-50 hover:text-red-600 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Tag Input */}
        <Input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Adicionar nova tag..."
          className="w-full h-9 text-sm border-dashed border-purple-200 focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg"
          aria-describedby="tag-input-helper"
        />
        <p id="tag-input-helper" className="text-xs text-gray-500 mt-1.5">
          Pressione Enter para adicionar
        </p>
      </div>
    </div>
  );
};
