import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Highlighter, List, ListOrdered, 
  ImagePlus, Type, Save, ArrowLeft, BookOpen, Tag, 
  Sparkles, X, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  const editorRef = useRef<HTMLDivElement>(null);
  
  const defaultContent = `
    <div class="space-y-6">
      <div>
        <h2 class="text-lg font-semibold text-gray-800 mb-3">📌 Pontos-chave da Aula</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li class="text-gray-700">Anatomia básica do sistema cardiovascular</li>
          <li class="text-gray-700">Principais patologias cardíacas</li>
          <li class="text-gray-700">Métodos de análise em termodinâmica</li>
        </ul>
      </div>
      
      <div>
        <h2 class="text-lg font-semibold text-gray-800 mb-3">❓ Minhas Dúvidas</h2>
        <ol class="list-decimal pl-6 space-y-2">
          <li class="text-gray-700">Como diferenciar sopros fisiológicos de patológicos?</li>
          <li class="text-gray-700">Qual a importância do diagrama P-V na análise de processos?</li>
        </ol>
      </div>
      
      <div>
        <h2 class="text-lg font-semibold text-gray-800 mb-3">📝 Resumo Pessoal</h2>
        <p class="text-gray-700">
          A aula de hoje foi fundamental para entender os conceitos básicos da termodinâmica. 
          <span class="bg-yellow-200 px-1">A anatomia do coração</span> é essencial para compreender 
          as patologias que serão estudadas nos próximos módulos.
        </p>
      </div>
    </div>
  `;

  const [content, setContent] = useState(defaultContent);
  const [title, setTitle] = useState('Anotações sobre Introdução à Termodinâmica');
  const [tags, setTags] = useState<string[]>(['Termodinâmica', 'Importante']);
  const [tagInput, setTagInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);

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

  const handleSave = () => {
    toast.success('Anotações salvas com sucesso!');
    console.log('Saving annotations:', { title, content, tags });
  };

  const handleSaveAndExit = () => {
    handleSave();
    navigate(-1);
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
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-study-materials', {
        body: { content },
      });

      if (error) {
        console.error('Error generating study materials:', error);
        toast.error('Erro ao gerar materiais de estudo. Tente novamente.');
        setIsGenerating(false);
        return;
      }

      if (data) {
        setStudyMaterials(data);
        toast.success('Materiais de estudo gerados com sucesso!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Erro inesperado. Tente novamente.');
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
              <Button
                onClick={handleSaveAndExit}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar e Sair
              </Button>
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
                      '[&_p]:text-gray-700 [&_p]:leading-relaxed'
                    )}
                    style={{ lineHeight: '1.6', fontSize: '16px' }}
                  />

                  {/* Sticky Toolbar */}
                  <div className="sticky bottom-6 mt-6">
                    <Card className="shadow-xl border-0 bg-white">
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
              {/* Source Panel */}
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
                    onClick={() => navigate('/lecture/1')}
                  >
                    Introdução à Termodinâmica
                  </Button>
                  <p className="text-sm text-foreground-muted mt-1">
                    Módulo 1 • Aula ao vivo
                  </p>
                </CardContent>
              </Card>

              {/* Tags Panel */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Etiquetas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Adicionar etiqueta..."
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

              {/* AI Study Materials Panel */}
              <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Materiais de Estudo com IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleGenerateStudyMaterials}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gerar Materiais de Estudo
                      </>
                    )}
                  </Button>

                  {studyMaterials && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">
                          Flashcards ({studyMaterials.flashcards.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {studyMaterials.flashcards.slice(0, 3).map((card, idx) => (
                            <div key={idx} className="p-2 bg-white/50 rounded text-xs">
                              <p className="font-medium">{card.front}</p>
                              <p className="text-foreground-muted">{card.back.slice(0, 50)}...</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">
                          Perguntas de Quiz ({studyMaterials.quizQuestions.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {studyMaterials.quizQuestions.slice(0, 3).map((q, idx) => (
                            <div key={idx} className="p-2 bg-white/50 rounded text-xs">
                              <p className="font-medium">{q.question.slice(0, 60)}...</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AnnotationPage;
