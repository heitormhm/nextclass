import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Reference, ReferenceType } from '../types/reference.types';

interface ReferencesSectionProps {
  references?: Reference[];
  isAdding: boolean;
  setIsAdding: (value: boolean) => void;
  editingIndex: number | null;
  setEditingIndex: (value: number | null) => void;
  newReference: Reference;
  setNewReference: (value: Reference) => void;
  editingReference: Reference | null;
  setEditingReference: (value: Reference | null) => void;
  onAddReference: () => void;
  onEditReference: () => void;
  onDeleteReference: (index: number) => void;
}

export const ReferencesSection: React.FC<ReferencesSectionProps> = ({
  references = [],
  isAdding,
  setIsAdding,
  editingIndex,
  setEditingIndex,
  newReference,
  setNewReference,
  editingReference,
  setEditingReference,
  onAddReference,
  onEditReference,
  onDeleteReference,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            <CardTitle>Referências Externas</CardTitle>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          )}
        </div>
        <CardDescription>
          Links e recursos complementares para esta aula
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Add new reference form */}
          {isAdding && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={newReference.titulo}
                  onChange={(e) => setNewReference({ ...newReference, titulo: e.target.value })}
                  placeholder="Nome da referência"
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={newReference.url}
                  onChange={(e) => setNewReference({ ...newReference, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newReference.tipo}
                  onValueChange={(value) => setNewReference({ ...newReference, tipo: value as ReferenceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="livro">Livro</SelectItem>
                    <SelectItem value="artigo">Artigo</SelectItem>
                    <SelectItem value="apresentação">Apresentação</SelectItem>
                    <SelectItem value="vídeo">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={onAddReference} size="sm">
                  <Check className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
                <Button onClick={() => setIsAdding(false)} size="sm" variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* List of references */}
          {references.map((ref, index) => (
            <div key={index} className="p-3 border rounded-lg">
              {editingIndex === index && editingReference ? (
                <div className="space-y-3">
                  <Input
                    value={editingReference.titulo}
                    onChange={(e) => setEditingReference({ ...editingReference, titulo: e.target.value })}
                  />
                  <Input
                    value={editingReference.url}
                    onChange={(e) => setEditingReference({ ...editingReference, url: e.target.value })}
                  />
                  <Select
                    value={editingReference.tipo}
                    onValueChange={(value) => setEditingReference({ ...editingReference, tipo: value as ReferenceType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site">Site</SelectItem>
                      <SelectItem value="livro">Livro</SelectItem>
                      <SelectItem value="artigo">Artigo</SelectItem>
                      <SelectItem value="apresentação">Apresentação</SelectItem>
                      <SelectItem value="vídeo">Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={onEditReference} size="sm">
                      <Check className="mr-2 h-4 w-4" />
                      Salvar
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingIndex(null);
                        setEditingReference(null);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{ref.titulo}</h4>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {ref.url}
                    </a>
                    <span className="text-xs text-muted-foreground ml-2">({ref.tipo})</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => {
                        setEditingIndex(index);
                        setEditingReference(ref);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => onDeleteReference(index)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {!isAdding && references.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma referência adicionada ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
