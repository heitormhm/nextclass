/**
 * AnnotationHeader - Title and tag management
 * Responsive header for annotation editing
 */

import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  const [showManageTagsDialog, setShowManageTagsDialog] = useState(false);

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
    <>
      <div className="mb-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 p-4">
          {/* Top Row: Back Button + Title + Generate Button */}
          <div className="flex items-center gap-3 mb-3">
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

          {/* Row 2: Tags + Manage Tags Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-purple-900 transition-colors flex items-center justify-center"
                      aria-label={`Remove ${tag} tag`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            <Button
              size="sm"
              onClick={() => setShowManageTagsDialog(true)}
              className={cn(
                'shrink-0 h-9 px-3 transition-all',
                'bg-gradient-to-br from-purple-500 to-pink-600 text-white',
                'hover:from-purple-600 hover:to-pink-700',
                'shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105'
              )}
            >
              <Tag className="h-4 w-4 mr-2" />
              Gerenciar Tags
            </Button>
          </div>
        </div>
      </div>

      {/* Manage Tags Dialog (Desktop) / Sheet (Mobile) */}
      {isMobile ? (
        <Sheet open={showManageTagsDialog} onOpenChange={setShowManageTagsDialog}>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Gerenciar Tags</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 pt-6">
              {/* Current Tags */}
              {isGeneratingTags && tags.length === 0 ? (
                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-200/50 animate-pulse">
                  <p className="text-sm font-semibold mb-3 text-purple-900 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Gerando tags...
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-7 w-20 bg-purple-200/50 rounded-full animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : tags.length > 0 ? (
                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-200/50">
                  <p className="text-sm font-semibold mb-3 text-purple-900 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags atuais ({tags.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        className="group bg-purple-100 text-purple-700 border border-purple-200 gap-1.5 text-xs px-2.5 py-1 animate-fade-in hover:border-purple-300 hover:bg-purple-200/60 transition-all duration-200"
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
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Nenhuma tag adicionada ainda</p>
                  <p className="text-xs mt-1">Organize suas anotações com tags</p>
                </div>
              )}

              {/* Add New Tag */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Adicionar nova tag</p>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Digite o nome da tag..."
                  className="w-full border-purple-300 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                  disabled={isGeneratingTags}
                />
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mt-1">
                  <span className="text-base">⌨️</span>
                  <p>Pressione <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">Enter</kbd> para adicionar</p>
                </div>
              </div>

              {/* AI Suggest Button */}
              <Button
                onClick={onGenerateTags}
                disabled={isGeneratingTags}
                className="w-full h-12 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isGeneratingTags ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Gerando tags...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sugerir tags com IA
                  </>
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={showManageTagsDialog} onOpenChange={setShowManageTagsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Gerenciar Tags</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-6">
              {/* Current Tags */}
              {isGeneratingTags && tags.length === 0 ? (
                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-200/50 animate-pulse">
                  <p className="text-sm font-semibold mb-3 text-purple-900 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Gerando tags...
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-7 w-20 bg-purple-200/50 rounded-full animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : tags.length > 0 ? (
                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-200/50">
                  <p className="text-sm font-semibold mb-3 text-purple-900 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags atuais ({tags.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        className="group bg-purple-100 text-purple-700 border border-purple-200 gap-1.5 text-xs px-2.5 py-1 animate-fade-in hover:border-purple-300 hover:bg-purple-200/60 transition-all duration-200"
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
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Nenhuma tag adicionada ainda</p>
                  <p className="text-xs mt-1">Organize suas anotações com tags</p>
                </div>
              )}

              {/* Add New Tag */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Adicionar nova tag</p>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Digite o nome da tag..."
                  className="w-full border-purple-300 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                  disabled={isGeneratingTags}
                />
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mt-1">
                  <span className="text-base">⌨️</span>
                  <p>Pressione <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">Enter</kbd> para adicionar</p>
                </div>
              </div>

              {/* AI Suggest Button */}
              <Button
                onClick={onGenerateTags}
                disabled={isGeneratingTags}
                className="w-full h-12 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isGeneratingTags ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Gerando tags...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sugerir tags com IA
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
