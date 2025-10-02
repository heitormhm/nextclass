import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Mic, MicOff, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

export const EditWithAIModal: React.FC<EditWithAIModalProps> = ({
  isOpen,
  onClose,
  sectionTitle,
  currentContent,
  onUpdate,
  lectureId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
        onUpdate(data.updatedContent);
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

  const handleVoiceInput = async () => {
    if (isRecording) {
      setIsRecording(false);
      toast({
        title: 'Gravação finalizada',
        description: 'Processando áudio...',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      toast({
        title: 'Gravando',
        description: 'Fale sua instrução de edição',
      });

      // Simplified voice recording logic
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        toast({
          title: 'Funcionalidade em desenvolvimento',
          description: 'Use texto por enquanto',
        });
      }, 5000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no microfone',
        description: 'Não foi possível acessar o microfone',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Editar com Mia: {sectionTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 h-[500px]">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 text-purple-400" />
                  <p className="mb-2">Olá! Sou a Mia, sua assistente de IA.</p>
                  <p className="text-sm">
                    Como posso ajudar a melhorar este conteúdo?
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite sua instrução de edição ou use o microfone..."
              className="flex-1 bg-slate-800 border-slate-600 text-white resize-none"
              rows={3}
              disabled={isLoading}
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleVoiceInput}
                variant="outline"
                size="icon"
                className={`${
                  isRecording
                    ? 'bg-red-600 border-red-600 hover:bg-red-700'
                    : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
                }`}
                disabled={isLoading}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4 text-white" />
                ) : (
                  <Mic className="h-4 w-4 text-white" />
                )}
              </Button>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-700"
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
