import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, FileIcon, X, Plus, Loader2, BookOpen, FileText, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Annotation {
  id: string;
  title: string;
  content: string;
}

interface PublishMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  annotation?: Annotation | null;
  onPublishSuccess: () => void;
}

interface Turma {
  id: string;
  nome_turma: string;
  curso: string;
  periodo: string;
}

interface Disciplina {
  id: string;
  nome: string;
  codigo?: string;
}

export const PublishMaterialModal = ({
  isOpen,
  onClose,
  annotation,
  onPublishSuccess
}: PublishMaterialModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState(annotation?.title || "");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState("");
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showCreateDisciplina, setShowCreateDisciplina] = useState(false);
  const [newDisciplinaName, setNewDisciplinaName] = useState("");
  const [newDisciplinaCodigo, setNewDisciplinaCodigo] = useState("");

  useEffect(() => {
    if (isOpen && user) {
      loadTurmas();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (selectedTurmaId) {
      loadDisciplinas(selectedTurmaId);
    } else {
      setDisciplinas([]);
      setSelectedDisciplinaId("");
    }
  }, [selectedTurmaId]);

  const loadTurmas = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_turma_access')
        .select(`
          turma_id,
          turmas (
            id,
            nome_turma,
            curso,
            periodo
          )
        `)
        .eq('teacher_id', user?.id);

      if (error) throw error;
      
      const turmasData = data
        .map(item => item.turmas)
        .filter(Boolean) as unknown as Turma[];
      
      setTurmas(turmasData);
    } catch (error) {
      console.error('Error loading turmas:', error);
      toast.error('Erro ao carregar turmas');
    }
  };

  const loadDisciplinas = async (turmaId: string) => {
    try {
      const { data, error } = await supabase
        .from('disciplinas')
        .select('id, nome, codigo')
        .eq('turma_id', turmaId)
        .eq('teacher_id', user?.id);

      if (error) throw error;
      setDisciplinas(data || []);
    } catch (error) {
      console.error('Error loading disciplinas:', error);
      toast.error('Erro ao carregar disciplinas');
    }
  };

  const handleCreateDisciplina = async () => {
    if (!newDisciplinaName.trim() || !selectedTurmaId) return;

    try {
      const { data, error } = await supabase
        .from('disciplinas')
        .insert({
          turma_id: selectedTurmaId,
          teacher_id: user?.id,
          nome: newDisciplinaName.trim(),
          codigo: newDisciplinaCodigo.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Disciplina criada com sucesso!');
      setDisciplinas(prev => [...prev, data]);
      setSelectedDisciplinaId(data.id);
      setShowCreateDisciplina(false);
      setNewDisciplinaName("");
      setNewDisciplinaCodigo("");
    } catch (error) {
      console.error('Error creating disciplina:', error);
      toast.error('Erro ao criar disciplina');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 50MB');
      return;
    }

    setSelectedFile(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileType = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = {
      'pdf': 'pdf',
      'doc': 'document',
      'docx': 'document',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'mp3': 'audio',
      'wav': 'audio',
      'mp4': 'video',
      'avi': 'video',
    };
    return typeMap[extension] || 'document';
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return null;

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('library-materials')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('library-materials')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload do arquivo');
      return null;
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !selectedFile || !selectedTurmaId || !selectedDisciplinaId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsPublishing(true);

      const fileUrl = await handleUploadFile();
      if (!fileUrl) return;

      const { error } = await supabase
        .from('library_materials')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          file_url: fileUrl,
          file_type: getFileType(selectedFile),
          class_id: selectedTurmaId,
          disciplina_id: selectedDisciplinaId,
          teacher_id: user?.id,
        });

      if (error) throw error;

      toast.success('Material publicado com sucesso!');
      onPublishSuccess();
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Erro ao publicar material');
    } finally {
      setIsPublishing(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl border-purple-100/30 shadow-[0_8px_30px_rgb(147,51,234,0.15)]
        [&::-webkit-scrollbar]:w-2 
        [&::-webkit-scrollbar-track]:bg-transparent 
        [&::-webkit-scrollbar-thumb]:bg-purple-200/50 
        [&::-webkit-scrollbar-thumb]:rounded-full 
        [&::-webkit-scrollbar-thumb]:hover:bg-purple-300/70
        [&::-webkit-scrollbar-thumb]:transition-colors">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Publicar Material para Alunos
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Material Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título do Material *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Apostila de Termodinâmica - Capítulo 3"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o conteúdo do material..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label>Arquivo *</Label>
            <div 
              className="mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm font-medium">Arraste arquivos ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDFs, Imagens, Áudios, Vídeos (máx 50MB)
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.mp3,.mp4,.doc,.docx,.wav,.avi"
                className="hidden"
              />
            </div>

            {selectedFile && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileIcon className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Target Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="turma">Turma *</Label>
              <Select
                value={selectedTurmaId}
                onValueChange={(value) => {
                  setSelectedTurmaId(value);
                  setSelectedDisciplinaId('');
                }}
              >
                <SelectTrigger id="turma" className="mt-1">
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map(turma => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome_turma} - {turma.curso} ({turma.periodo}º período)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="disciplina">Disciplina *</Label>
              <Select
                value={selectedDisciplinaId}
                onValueChange={setSelectedDisciplinaId}
                disabled={!selectedTurmaId}
              >
                <SelectTrigger id="disciplina" className="mt-1">
                  <SelectValue placeholder="Selecione uma disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map(disc => (
                    <SelectItem key={disc.id} value={disc.id}>
                      {disc.nome} {disc.codigo && `(${disc.codigo})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDisciplina(true)}
                disabled={!selectedTurmaId}
                className="mt-2 w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Nova Disciplina
              </Button>
            </div>

            {/* Inline Disciplina Creation */}
            {showCreateDisciplina && (
              <Card className="p-4 bg-purple-50 border-purple-200">
                <h4 className="font-semibold mb-3 text-purple-900">Nova Disciplina</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="new-disc-name">Nome da Disciplina *</Label>
                    <Input
                      id="new-disc-name"
                      value={newDisciplinaName}
                      onChange={(e) => setNewDisciplinaName(e.target.value)}
                      placeholder="Ex: Termodinâmica Aplicada"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-disc-code">Código (opcional)</Label>
                    <Input
                      id="new-disc-code"
                      value={newDisciplinaCodigo}
                      onChange={(e) => setNewDisciplinaCodigo(e.target.value)}
                      placeholder="Ex: ENG-201"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateDisciplina}
                      disabled={!newDisciplinaName.trim()}
                      className="flex-1"
                    >
                      Criar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowCreateDisciplina(false);
                        setNewDisciplinaName("");
                        setNewDisciplinaCodigo("");
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isPublishing}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || !title.trim() || !selectedFile || !selectedTurmaId || !selectedDisciplinaId}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar Material'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
