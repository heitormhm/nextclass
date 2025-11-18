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
    <div className="mb-4">
      {/* Integrated Single-Line Header with Inline Tags */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 p-4">
        {/* Top Row: Back Button + Title + Generate Button */}
        <div className="flex items-center gap-3 mb-4">
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
              'bg-gradient-to-br from-purple-500 to-pink-600 text-white',
              'hover:from-purple-600 hover:to-pink-700',
              'shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105',
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

        {/* Tags Section Inline Below Title */}
        <div className="space-y-3">
          {/* Tags Label (Bigger and Bold) */}
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-purple-600" />
            <span className="text-base md:text-lg font-bold text-gray-800">
              Tags {tags.length > 0 && <span className="text-gray-600">({tags.length})</span>}
            </span>
          </div>

          {/* Existing Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  className="group bg-purple-100 text-purple-700 border-2 border-purple-200 gap-2 text-sm px-3 py-1.5 animate-fade-in hover:border-purple-300 hover:bg-purple-200/60 transition-all duration-200"
                >
                  <span className="select-none">{tag}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    className="inline-flex items-center justify-center rounded-full p-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3.5 w-3.5 text-purple-600 hover:text-red-600 transition-colors duration-200" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Tag Input + Suggest Button on Same Line */}
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Adicionar nova tag..."
              className="flex-1 h-10 text-sm border-dashed border-purple-200 focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg"
              aria-describedby="tag-input-helper"
            />
            
            <Button
              onClick={onGenerateTags}
              disabled={isGeneratingTags}
              className={cn(
                'shrink-0 h-10 px-4 rounded-lg text-sm font-medium transition-all',
                'bg-gradient-to-br from-pink-500 to-purple-600 text-white',
                'hover:from-pink-600 hover:to-purple-700',
                'shadow-lg shadow-pink-500/30 hover:shadow-xl hover:scale-105',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label="Suggest tags with AI"
              title="Sugerir tags relevantes"
            >
              {isGeneratingTags ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {!isMobile && <span>Sugerir</span>}
                </>
              )}
            </Button>
          </div>
          
          <p id="tag-input-helper" className="text-xs text-gray-500">
            Pressione Enter para adicionar uma tag
          </p>
        </div>
      </div>
    </div>
  );
};
