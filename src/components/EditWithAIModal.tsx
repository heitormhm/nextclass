import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Mic, MicOff, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface EditWithAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
  currentContent: any;
  onUpdate: (updatedContent: any) => void;
  lectureId: string;
  prefilledPrompt?: string;
  additionalContext?: {
    isIndividualItem?: boolean;
    itemIndex?: number;
    onSave?: (data: any) => void;
  };
}

export const EditWithAIModal: React.FC<EditWithAIModalProps> = ({
  isOpen,
  onClose,
  sectionTitle,
  currentContent,
  onUpdate,
  lectureId,
  prefilledPrompt,
  additionalContext,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    onTranscriptionReceived,
    error: speechError 
  } = useAudioRecorder();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    onTranscriptionReceived((text: string) => {
      setInput(prev => prev ? `${prev} ${text}` : text);
    });
  }, [onTranscriptionReceived]);

  useEffect(() => {
    if (speechError) {
      toast({
        variant: 'destructive',
        title: 'Erro no reconhecimento de voz',
        description: speechError,
      });
    }
  }, [speechError, toast]);

  useEffect(() => {
    if (isOpen && prefilledPrompt) {
      setInput(prefilledPrompt);
    }
  }, [isOpen, prefilledPrompt]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('edit-lecture-content', {
        body: {
          lectureId,
          sectionTitle,
          currentContent: JSON.stringify(currentContent),
          editInstruction: input,
          conversationHistory: messages,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.updatedContent) {
        // Se for edição individual, chamar callback customizado
        if (additionalContext?.onSave) {
          additionalContext.onSave(data.updatedContent);
        } else {
          onUpdate(data.updatedContent);
        }
        toast({
          title: 'Conteúdo atualizado',
          description: 'As alterações foram aplicadas com sucesso',
        });
      }
    } catch (error) {
      console.error('Error editing content:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao editar',
        description: 'Não foi possível processar a edição',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col bg-white/75 backdrop-blur-xl border-white/40 shadow-2xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Editar com IA: {sectionTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 my-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg backdrop-blur-sm ${
                    message.role === 'user'
                      ? 'bg-blue-500/20 border border-blue-300/30'
                      : 'bg-white/95 border border-slate-200/50'
                  }`}
                >
                  <p className={`text-sm whitespace-pre-wrap ${
                    message.role === 'user' ? 'text-slate-900 font-medium' : 'text-slate-800'
                  }`}>
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 space-y-2 pt-4 border-t border-slate-300">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Digite suas instruções para editar o conteúdo..."
            className="min-h-[100px] bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <div className="flex gap-2 justify-end">
            <Button
              onClick={handleVoiceInput}
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              disabled={isLoading}
              className={isRecording ? "animate-pulse" : ""}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
