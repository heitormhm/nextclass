import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: Array<{ id: string; name: string; course: string; period: string }>;
}

const AnnouncementModal = ({ open, onOpenChange, classes }: AnnouncementModalProps) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast({
          title: "Navegador não suportado",
          description: "Use Chrome, Edge ou Safari para gravação de voz",
          variant: "destructive",
        });
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');
        
        setMessage(prev => prev + (prev ? ' ' : '') + transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Erro na gravação",
          description: "Não foi possível capturar o áudio",
          variant: "destructive",
        });
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
        toast({
          title: "Transcrição concluída",
          description: "O texto foi adicionado ao campo de mensagem",
        });
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      
      toast({
        title: "Gravação iniciada",
        description: "Fale agora para transcrever sua mensagem",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro ao iniciar gravação",
        description: "Verifique as permissões do microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!selectedClass || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma turma e escreva uma mensagem",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-class-announcement', {
        body: {
          classId: selectedClass,
          message: message.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Anúncio enviado",
        description: "Todos os alunos da turma foram notificados",
      });

      setMessage('');
      setSelectedClass('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast({
        title: "Erro ao enviar anúncio",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-800/95 backdrop-blur-xl border-slate-700 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-100">Enviar Anúncio para a Turma</DialogTitle>
          <DialogDescription className="text-slate-400">
            Envie uma mensagem importante para todos os alunos da turma selecionada
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Class Selector */}
          <div className="space-y-2">
            <Label className="text-slate-200">Turma de Destino</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100 hover:bg-slate-800">
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                {classes.map((classItem) => (
                  <SelectItem 
                    key={classItem.id} 
                    value={classItem.id}
                    className="hover:bg-slate-700 focus:bg-slate-700"
                  >
                    {classItem.name} - {classItem.course} ({classItem.period})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Text Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="text-slate-200">Mensagem do Anúncio</Label>
              <Button
                type="button"
                size="sm"
                variant={isRecording ? "destructive" : "outline"}
                onClick={isRecording ? stopRecording : startRecording}
                className={isRecording 
                  ? "animate-pulse bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-slate-900 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Parar Gravação
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Gravar Voz
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="message"
              placeholder="Digite ou grave sua mensagem para a turma..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[150px] bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
            <p className="text-xs text-slate-500">
              {message.length} caracteres
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            disabled={isSending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSendAnnouncement}
            disabled={!selectedClass || !message.trim() || isSending}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Enviando...' : 'Enviar Anúncio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementModal;
