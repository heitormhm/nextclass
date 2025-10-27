import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Mic, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface UploadMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Array<{ id: string; name: string }>;
}

export const UploadMaterialModal = ({ isOpen, onClose, classes }: UploadMaterialModalProps) => {
  const [title, setTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  // Novos estados
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDisciplina, setSelectedDisciplina] = useState("");
  const [tags, setTags] = useState("");
  const [disciplinas, setDisciplinas] = useState<Array<{ id: string; nome: string; codigo?: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio recorder hook
  const {
    isRecording,
    startRecording,
    stopRecording,
    onTranscriptionReceived,
  } = useAudioRecorder();
  
  // Configurar callback de transcrição
  useEffect(() => {
    onTranscriptionReceived((transcription: string) => {
      setTitle(prev => prev + (prev ? ' ' : '') + transcription);
    });
  }, [onTranscriptionReceived]);
  
  // Carregar disciplinas quando turma é selecionada
  useEffect(() => {
    const fetchDisciplinas = async () => {
      if (!selectedClass) {
        setDisciplinas([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('disciplinas')
        .select('id, nome, codigo')
        .eq('turma_id', selectedClass);
      
      if (error) {
        console.error('Error fetching disciplinas:', error);
        return;
      }
      
      setDisciplinas(data || []);
    };
    
    fetchDisciplinas();
  }, [selectedClass]);

  // Handlers de voz
  const handleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Validar tamanho (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 50MB.",
      });
      return;
    }
    
    // Validar tipo
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4',
      'audio/mpeg',
      'audio/mp3',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Tipo de arquivo inválido",
        description: "Apenas PDF, DOCX, PPTX, XLSX, MP4 e MP3 são permitidos.",
      });
      return;
    }
    
    setSelectedFile(file);
    toast({
      title: "Arquivo selecionado",
      description: file.name,
    });
  };

  const handleUpload = async () => {
    // Validação
    if (!title || !selectedClass || !selectedDisciplina || !selectedFile) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e selecione um arquivo.",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      // 1. Upload do arquivo para Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('library-materials')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      // 2. Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('library-materials')
        .getPublicUrl(filePath);
      
      // 3. Processar tags
      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      // 4. Inserir registro no banco (usando turma_id ao invés de class_id)
      const { error: insertError } = await supabase
        .from('library_materials')
        .insert({
          title,
          file_url: publicUrl,
          file_type: selectedFile.type,
          turma_id: selectedClass,
          disciplina_id: selectedDisciplina,
          teacher_id: user.id,
          tags: tagArray,
          description: `Material: ${title}`,
        });
      
      if (insertError) throw insertError;
      
      toast({
        title: "Material adicionado! ✅",
        description: "O material está disponível na biblioteca dos alunos.",
      });
      
      // Reset e fechar
      setTitle("");
      setSelectedClass("");
      setSelectedDisciplina("");
      setTags("");
      setSelectedFile(null);
      onClose();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/70 backdrop-blur-xl border-white/30 text-gray-900 shadow-2xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Adicionar Material à Biblioteca
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Título do Material com Voice Input */}
          <div>
            <Label htmlFor="title" className="text-gray-800 font-semibold mb-2 block">
              Título do Material
            </Label>
            <div className="flex gap-2">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Apostila de Resistência dos Materiais"
                className="flex-1 bg-white/90 border-purple-200 text-gray-900 placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleVoiceInput}
                className={cn(
                  "shrink-0 border-purple-200 hover:bg-purple-50",
                  isRecording && "bg-purple-100 border-purple-400"
                )}
                title="Input por voz"
              >
                <Mic className={cn(
                  "h-4 w-4 text-purple-600",
                  isRecording && "animate-pulse"
                )} />
              </Button>
            </div>
          </div>

          {/* Turma */}
          <div>
            <Label htmlFor="class" className="text-gray-800 font-semibold mb-2 block">
              Turma
            </Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="bg-white/90 border-purple-200 text-gray-900 focus:border-purple-400 focus:ring-purple-400">
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-purple-200">
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id} className="text-gray-900 hover:bg-purple-50">
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Disciplina - NOVO */}
          <div>
            <Label htmlFor="disciplina" className="text-gray-800 font-semibold mb-2 block">
              Disciplina
            </Label>
            <Select value={selectedDisciplina} onValueChange={setSelectedDisciplina} disabled={!selectedClass}>
              <SelectTrigger className="bg-white/90 border-purple-200 text-gray-900 focus:border-purple-400 focus:ring-purple-400">
                <SelectValue placeholder={selectedClass ? "Selecione a disciplina" : "Selecione uma turma primeiro"} />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-purple-200">
                {disciplinas.map((disc) => (
                  <SelectItem key={disc.id} value={disc.id} className="text-gray-900 hover:bg-purple-50">
                    {disc.nome} {disc.codigo ? `(${disc.codigo})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags - NOVO */}
          <div>
            <Label htmlFor="tags" className="text-gray-800 font-semibold mb-2 block">
              Tags (separadas por vírgula)
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: apostila, mecânica, resistência"
              className="bg-white/90 border-purple-200 text-gray-900 placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400"
            />
            <p className="text-xs text-gray-600 mt-1">
              As tags ajudam os alunos a encontrar o material
            </p>
          </div>

          {/* Upload Area - FUNCIONAL */}
          <div 
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
              isDragging ? "border-purple-500 bg-purple-50/50" : "border-purple-300 bg-white/40 hover:bg-purple-50/30"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.docx,.mp4,.mp3,.pptx,.xlsx"
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                  <span className="font-semibold">{selectedFile.name}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  Remover arquivo
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-3 text-purple-500" />
                <p className="text-base text-gray-700 font-medium mb-1">
                  Arraste arquivos aqui ou clique para fazer upload
                </p>
                <p className="text-sm text-gray-600">
                  PDF, DOCX, PPTX, XLSX, MP4, MP3 (máx. 50MB)
                </p>
              </>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="border-purple-200 text-gray-700 hover:bg-purple-50"
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || !selectedFile}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Fazer Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};