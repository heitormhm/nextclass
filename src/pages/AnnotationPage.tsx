import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Highlighter, List, ListOrdered, 
  ImagePlus, Type, Save, ArrowLeft, BookOpen, Tag, 
  Sparkles, X, Loader2, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';

interface Flashcard {
  front: string;
  back: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface StudyMaterials {
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

const AnnotationPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (location.state?.prePopulatedContent) {
      setContent(location.state.prePopulatedContent);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  }, []);

  const generateTitleWithAI = async () => {
    if (!content.trim()) {
      toast.error('Escreva algum conteúdo primeiro');
      return;
    }

    setIsGeneratingTitle(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-annotation-title', {
        body: { content }
      });
      
      if (error) throw error;
      
      if (data?.title) {
        setTitle(data.title);
        toast.success('Título gerado por IA!');
      }
    } catch (error) {
      console.error('Error generating title:', error);
      toast.error('Erro ao gerar título');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    let finalTitle = title.trim();
    
    // Gerar título automaticamente se estiver vazio
    if (!finalTitle && content.trim()) {
      await generateTitleWithAI();
      finalTitle = title.trim();
    }

    if (!finalTitle) {
      toast.error('Por favor, adicione um título');
      return;
    }

    setIsSaving(true);
    try {
      if (id && id !== 'new') {
        // Atualizar anotação existente
        const { error } = await supabase
          .from('annotations')
          .update({
            title: finalTitle,
            content,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Criar nova anotação
        const { error } = await supabase
          .from('annotations')
          .insert({
            user_id: user.id,
            title: finalTitle,
            content,
            source_type: location.state?.sourceType,
            source_id: location.state?.sourceId,
          });
        
        if (error) throw error;
      }
      
      toast.success('Anotação salva com sucesso!');
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error('Erro ao salvar anotação');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    await handleSave();
    navigate('/annotations');
  };

  const handleExportPDF = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Adicione título e conteúdo antes de exportar');
      return;
    }

    try {
      // Por enquanto, informar que a funcionalidade será adicionada em breve
      toast.info('Funcionalidade de exportação PDF será adicionada em breve');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const generateTagsWithAI = async () => {
    if (!content.trim()) {
      toast.error('Escreva conteúdo primeiro');
      return;
    }

    setIsGeneratingTags(true);
    
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: 'generate_annotation_tags',
          status: 'PENDING',
          input_payload: { 
            content, 
            title,
            annotation_id: id 
          }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      toast.success('Tags sendo geradas...');
      
      const pollInterval = setInterval(async () => {
        const { data: updatedJob } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobData.id)
          .single();

        if (updatedJob?.status === 'COMPLETED') {
          clearInterval(pollInterval);
          const tags = JSON.parse(updatedJob.result || '[]');
          setSuggestedTags(tags);
          toast.success('Tags sugeridas geradas!');
          setIsGeneratingTags(false);
        } else if (updatedJob?.status === 'FAILED') {
          clearInterval(pollInterval);
          toast.error('Erro ao gerar tags');
          setIsGeneratingTags(false);
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGeneratingTags) {
          setIsGeneratingTags(false);
          toast.error('Tempo esgotado');
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Erro ao criar tarefa');
      setIsGeneratingTags(false);
    }
  };

  const handleHighlight = () => {
    executeCommand('hiliteColor', '#fef08a');
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const placeholderUrl = 'https://via.placeholder.com/300x200?text=Imagem+Carregada';
        executeCommand('insertHTML', `<img src="${placeholderUrl}" alt="Imagem carregada" style="max-width: 100%; height: auto; margin: 10px 0;" />`);
        toast.success('Imagem inserida com sucesso!');
      }
    };
    input.click();
  };

  const handleAddTextbox = () => {
    const textboxHtml = `
      <div style="border: 2px dashed #e2e8f0; padding: 10px; margin: 10px 0; background: #f8fafc;">
        <p style="margin: 0; color: #64748b; font-style: italic;">Clique para editar este textbox...</p>
      </div>
    `;
    executeCommand('insertHTML', textboxHtml);
    toast.success('Textbox adicionado!');
  };

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleGenerateStudyMaterials = async () => {
    if (!content.trim()) {
      toast.error('Escreva conteúdo antes de gerar materiais');
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: 'generate_study_materials',
          status: 'PENDING',
          input_payload: { 
            content, 
            title,
            annotation_id: id 
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Materiais sendo gerados em segundo plano! Você será notificado quando estiverem prontos.');
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Erro ao criar tarefa de geração');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
        {/* Fixed Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold bg-transparent border-none focus:outline-none w-full"
                  placeholder="Título da Anotação"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="border-pink-500 text-pink-500 hover:bg-pink-50"
                  disabled={isSaving}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button
                  onClick={handleSaveAndExit}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Salvar e Sair</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Editor */}
            <div className="lg:col-span-8">
              <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    dangerouslySetInnerHTML={{ __html: content }}
                    className={cn(
                      'min-h-[600px] p-6 rounded-lg',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20',
                      'prose prose-gray max-w-none',
                      '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-800 [&_h2]:mb-3',
                      '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2',
                      '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2',
                      '[&_li]:text-gray-700',
                      '[&_p]:text-gray-700 [&_p]:leading-relaxed',
                      !content && 'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text'
                    )}
                    data-placeholder="Comece a escrever sua anotação..."
                    style={{ lineHeight: '1.6', fontSize: '16px' }}
                  />

                  {/* Floating Toolbar - CENTRALIZADA */}
                  <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30 mt-6">
                    <Card className="shadow-2xl border-0 bg-white">
                      <CardContent className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => executeCommand('bold')}
                            title="Negrito"
                          >
                            <Bold className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => executeCommand('italic')}
                            title="Itálico"
                          >
                            <Italic className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => executeCommand('underline')}
                            title="Sublinhado"
                          >
                            <Underline className="h-4 w-4" />
                          </Button>
                          <div className="w-px h-6 bg-gray-300" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleHighlight}
                            title="Destacar"
                          >
                            <Highlighter className="h-4 w-4" />
                          </Button>
                          <div className="w-px h-6 bg-gray-300" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => executeCommand('insertUnorderedList')}
                            title="Lista"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => executeCommand('insertOrderedList')}
                            title="Lista numerada"
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                          <div className="w-px h-6 bg-gray-300" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleImageUpload}
                            title="Inserir Imagem"
                          >
                            <ImagePlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleAddTextbox}
                            title="Adicionar Textbox"
                          >
                            <Type className="h-4 w-4" />
                          </Button>
                          <div className="w-px h-6 bg-gray-300" />
                          <Button
                            onClick={handleSave}
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Salvar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Source Panel - CONDICIONAL */}
              {(location.state?.sourceType || location.state?.sourceId) && (
                <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Fonte da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary hover:text-primary/80"
                      onClick={() => {
                        if (location.state?.sourceType === 'lecture') {
                          navigate(`/lecture/${location.state.sourceId}`);
                        } else if (location.state?.sourceType === 'internship') {
                          navigate(`/internship/${location.state.sourceId}`);
                        }
                      }}
                    >
                      {location.state?.sourceName || 'Ver Fonte'}
                    </Button>
                    <p className="text-sm text-foreground-muted mt-1">
                      {location.state?.sourceType === 'lecture' ? 'Aula' : 'Modo Estágio'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Tags Panel */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Etiquetas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={generateTagsWithAI}
                    disabled={isGeneratingTags}
                    variant="outline"
                    size="sm"
                    className="w-full mb-2"
                  >
                    {isGeneratingTags ? (
                      <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Gerando...</>
                    ) : (
                      <><Sparkles className="h-3 w-3 mr-2" />Sugerir Tags com IA</>
                    )}
                  </Button>
                  
                  {suggestedTags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Sugestões de IA:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedTags.map((tag, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline"
                            className="cursor-pointer hover:bg-pink-100 transition-colors"
                            onClick={() => {
                              if (!tags.includes(tag)) {
                                setTags([...tags, tag]);
                                setSuggestedTags(suggestedTags.filter(t => t !== tag));
                              }
                            }}
                          >
                            + {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Adicionar manualmente..."
                      className="flex-1"
                    />
                    <Button onClick={handleAddTag} size="sm">
                      Adicionar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Study Materials Panel - CONVERTIDO PARA JOB */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Materiais de Estudo com IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleGenerateStudyMaterials}
                    disabled={isGenerating || !content.trim()}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando tarefa...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gerar Materiais (em background)
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    A geração ocorre em segundo plano e você será notificado quando estiver pronta
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Floating AI Assistant Button */}
            <Button
              onClick={() => {
                navigate('/chat', { 
                  state: { 
                    initialPrompt: `Gerar materiais de estudo sobre ${title || 'o conteúdo desta anotação'}` 
                  } 
                });
              }}
              className="fixed bottom-28 right-8 rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 z-40"
              size="icon"
              title="Pesquisar com IA Mia"
            >
              <Sparkles className="h-6 w-6 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AnnotationPage;
