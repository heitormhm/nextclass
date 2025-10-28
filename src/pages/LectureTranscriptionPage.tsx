import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { MaterialDidaticoView } from '@/components/material-didatico/MaterialDidaticoView';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLecturePublishing } from '@/hooks/useLecturePublishing';
import { Loader2 } from 'lucide-react';

const LectureTranscriptionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { publishLecture } = useLecturePublishing();
  
  const [isLoading, setIsLoading] = useState(true);
  const [lecture, setLecture] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadLecture();
    }
  }, [id]);

  const loadLecture = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setLecture(data);
    } catch (error: any) {
      console.error('Error loading lecture:', error);
      toast({
        title: 'Erro ao Carregar',
        description: error.message || 'Falha ao carregar material',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setLecture((prev: any) => ({ ...prev, title: newTitle }));
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('lectures')
        .update({ title: lecture.title })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: '✅ Salvo',
        description: 'Alterações salvas com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao Salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async () => {
    toast({
      title: '🚀 Publicação',
      description: 'Funcionalidade completa em breve',
    });
  };

  const handleExportPDF = async () => {
    toast({
      title: '📄 Exportar PDF',
      description: 'Funcionalidade em breve',
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <TeacherBackgroundRipple />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(270 70% 50%)' }} />
        </div>
      </MainLayout>
    );
  }

  if (!lecture) {
    return (
      <MainLayout>
        <TeacherBackgroundRipple />
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500">Material não encontrado</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <TeacherBackgroundRipple />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <MaterialDidaticoView
          lectureId={id!}
          lecture={lecture}
          onTitleChange={handleTitleChange}
          onSave={handleSave}
          onPublish={handlePublish}
          onExportPDF={handleExportPDF}
        />
      </div>
    </MainLayout>
  );
};

export default LectureTranscriptionPage;
