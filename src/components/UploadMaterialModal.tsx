import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

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

  const handleUpload = async () => {
    if (!title || !selectedClass) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Mock file URL - in real implementation, this would upload to storage first
      const mockFileUrl = `https://example.com/materials/${Date.now()}.pdf`;
      
      const { error } = await supabase.functions.invoke('upload-library-material', {
        body: {
          title,
          fileUrl: mockFileUrl,
          fileType: 'pdf',
          classId: selectedClass,
        },
      });

      if (error) throw error;

      toast({
        title: "Material adicionado",
        description: "O material foi adicionado à biblioteca com sucesso.",
      });
      
      setTitle("");
      setSelectedClass("");
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o material.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Adicionar Material à Biblioteca</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título do Material</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Apostila de Mecânica dos Fluidos"
              className="bg-gray-800 border-gray-700"
            />
          </div>
          <div>
            <Label htmlFor="class">Turma</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-400">
              Arraste arquivos aqui ou clique para fazer upload
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, DOCX, MP4, MP3 (máx. 50MB)
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} className="border-gray-700">
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? "Enviando..." : "Fazer Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};