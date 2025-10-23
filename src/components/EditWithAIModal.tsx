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

  const handleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-white/20 backdrop-blur-xl border-white/30 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Editar com Mia: {sectionTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 h-[500px] px-1">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-slate-700 dark:text-slate-300">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 text-purple-600 dark:text-purple-400" />
                  <p className="mb-2 font-medium">Olá! Sou a Mia, sua assistente de IA.</p>
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
                      className={`max-w-[80%] rounded-lg p-3 backdrop-blur-sm ${
                        msg.role === 'user'
                          ? 'bg-purple-600/90 text-white shadow-lg'
                          : 'bg-white/40 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 border border-white/20'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <Loader2 className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
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
                className="bg-white/40 dark:bg-slate-800/40 border-white/30 text-slate-900 dark:text-white resize-none backdrop-blur-sm pr-12"
                rows={3}
                disabled={isLoading}
              />
              <Button
                onClick={handleVoiceInput}
                variant="ghost"
                size="icon"
                className={`absolute bottom-2 right-2 h-8 w-8 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'hover:bg-white/20'
                }`}
                disabled={isLoading}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 h-[88px]"
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
