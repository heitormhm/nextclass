/**
 * PostItManager - Renders floating post-it annotations
 * Displays and manages comment cards attached to highlighted text
 */

import React, { useState } from 'react';
import { MessageSquare, X, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { PostIt } from '@/tiptap/plugins/postItPlugin';

interface PostItManagerProps {
  postIts: PostIt[];
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export const PostItManager: React.FC<PostItManagerProps> = ({
  postIts,
  onUpdate,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleEdit = (postIt: PostIt) => {
    setEditingId(postIt.id);
    setEditContent(postIt.content);
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim()) {
      onUpdate(editingId, editContent);
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (postIts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Post-Its */}
      <div className="fixed right-4 top-24 z-20 max-w-xs space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {postIts.map((postIt) => (
          <Card 
            key={postIt.id} 
            className="bg-yellow-50 border-yellow-200 shadow-lg hover:shadow-xl transition-shadow"
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                    {postIt.content}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-yellow-200">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(postIt)}
                  className="h-7 px-2 text-xs hover:bg-yellow-100"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(postIt.id)}
                  className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={handleCancelEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Comentário</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Escreva seu comentário..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editContent.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
