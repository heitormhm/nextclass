import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, Highlighter, List, ListOrdered, Share2, Trash2, Save, ImagePlus, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

const AnnotationPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Default content for when no pre-populated content is provided
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

  // Check for pre-populated content from router state
  useEffect(() => {
    if (location.state?.prePopulatedContent) {
      setContent(location.state.prePopulatedContent);
      // Clear the state after using it to prevent issues on refresh
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
    // Placeholder save function
    toast.success("Anotações salvas com sucesso!");
    console.log("Saving annotations:", content);
  };

  const handleSaveAndExit = () => {
    handleSave();
    navigate(-1); // Go back to previous page
  };

  const handleShare = () => {
    toast.info("Funcionalidade de compartilhamento em desenvolvimento");
  };

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja apagar todas as anotações?")) {
      setContent("");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      toast.success("Anotações apagadas");
    }
  };

  const handleHighlight = () => {
    executeCommand('hiliteColor', '#fef08a'); // Yellow highlight
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Mock image insertion - in real app would upload and get URL
        const placeholderUrl = 'https://via.placeholder.com/300x200?text=Imagem+Carregada';
        executeCommand('insertHTML', `<img src="${placeholderUrl}" alt="Imagem carregada" style="max-width: 100%; height: auto; margin: 10px 0;" />`);
        toast.success("Imagem inserida com sucesso!");
      }
    };
    input.click();
  };

  const handleAddTextbox = () => {
    const textboxHtml = `
      <div style="border: 2px dashed #e2e8f0; padding: 10px; margin: 10px 0; background: #f8fafc; position: relative; cursor: move;">
        <p style="margin: 0; color: #64748b; font-style: italic;">Clique para editar este textbox...</p>
      </div>
    `;
    executeCommand('insertHTML', textboxHtml);
    toast.success("Textbox adicionado!");
  };

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const lessonTitle = `Anotações sobre Introdução à Termodinâmica`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Introdução à Termodinâmica</h1>
            <p className="text-sm text-gray-600 mt-1">Aula ao vivo • Módulo 1</p>
          </div>
          <Button 
            onClick={handleSaveAndExit}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Salvar e Sair
          </Button>
        </div>

        {/* Main Annotation Card */}
        <Card className="max-w-4xl mx-auto shadow-lg border-0">
          <CardHeader className="pb-4">
            <h2 className="text-xl font-semibold text-gray-800 text-center">
              {lessonTitle}
            </h2>
          </CardHeader>
          
          <CardContent className="px-8 pb-24 relative">
            {/* Rich Text Editor */}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              dangerouslySetInnerHTML={{ __html: content }}
              className={cn(
                "min-h-[500px] p-6 rounded-lg border border-gray-200",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                "prose prose-gray max-w-none",
                "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-800 [&_h2]:mb-3",
                "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2",
                "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2",
                "[&_li]:text-gray-700",
                "[&_p]:text-gray-700 [&_p]:leading-relaxed",
                "[&_.highlight]:bg-yellow-200 [&_.highlight]:px-1"
              )}
              style={{
                lineHeight: '1.6',
                fontSize: '16px'
              }}
            />

            {/* Floating Toolbar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
              <Card className="shadow-xl border">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    {/* Text Formatting */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => executeCommand('bold')}
                      className="hover:bg-gray-100"
                      title="Negrito"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => executeCommand('italic')}
                      className="hover:bg-gray-100"
                      title="Itálico"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => executeCommand('underline')}
                      className="hover:bg-gray-100"
                      title="Sublinhado"
                    >
                      <Underline className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Highlighting */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleHighlight}
                      className="hover:bg-yellow-100"
                      title="Destacar"
                    >
                      <Highlighter className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Lists */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => executeCommand('insertUnorderedList')}
                      className="hover:bg-gray-100"
                      title="Lista com marcadores"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => executeCommand('insertOrderedList')}
                      className="hover:bg-gray-100"
                      title="Lista numerada"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Image Upload */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleImageUpload}
                      className="hover:bg-green-100"
                      title="Inserir Imagem"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    
                    {/* Add Textbox */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddTextbox}
                      className="hover:bg-purple-100"
                      title="Adicionar Textbox"
                    >
                      <Type className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Additional Tools */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShare}
                      className="hover:bg-blue-100"
                      title="Compartilhar"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="hover:bg-red-100"
                      title="Apagar anotações"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Save Button */}
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white px-4"
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
    </div>
  );
};

export default AnnotationPage;