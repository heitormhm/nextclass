import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import MainLayout from '@/components/MainLayout';
import { toast } from 'sonner';

const InternshipSetup = () => {
  const navigate = useNavigate();
  const [internshipType, setInternshipType] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartRecording = () => {
    // Validate inputs
    if (!internshipType.trim()) {
      toast.error('Por favor, informe em qual estágio você está');
      return;
    }

    if (!location.trim()) {
      toast.error('Por favor, informe onde você está indo');
      return;
    }

    setIsSubmitting(true);

    // Navigate to recording page with context data
    navigate('/internship/record', {
      state: {
        internshipType: internshipType.trim(),
        location: location.trim(),
      }
    });
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Configurar Sessão de Estágio
            </h1>
            <p className="text-foreground-muted max-w-xl mx-auto">
              Antes de iniciar a gravação, precisamos de algumas informações sobre o contexto da sua sessão.
              Isso ajudará na análise posterior.
            </p>
          </div>

          {/* Main Form Card */}
          <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                Informações do Contexto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Internship Type Input */}
              <div className="space-y-2">
                <Label htmlFor="internshipType" className="text-base font-medium">
                  Em qual estágio você está?
                </Label>
                <Input
                  id="internshipType"
                  placeholder="Ex: Estágio em Engenharia Mecânica, Residência Médica, etc."
                  value={internshipType}
                  onChange={(e) => setInternshipType(e.target.value)}
                  className="text-base"
                  autoFocus
                />
                <p className="text-xs text-foreground-muted">
                  Informe o tipo de estágio ou programa que você está cursando
                </p>
              </div>

              {/* Location Textarea */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-base font-medium">
                  Onde você está indo?
                </Label>
                <Textarea
                  id="location"
                  placeholder="Ex: Hospital Universitário - Setor de Cardiologia, Escritório de Projetos Estruturais, etc."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="min-h-[100px] text-base resize-none"
                />
                <p className="text-xs text-foreground-muted">
                  Descreva o local e o contexto da sessão que você vai gravar
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  onClick={handleStartRecording}
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full text-base h-12 gap-2"
                >
                  <Mic className="h-5 w-5" />
                  Iniciar Gravação do Cenário
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Help Text */}
              <div className="pt-2 text-center">
                <p className="text-xs text-foreground-muted">
                  Você será direcionado para a tela de gravação após preencher os campos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Information Box */}
          <Card className="mt-6 border-0 bg-primary/5 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">Por que essas informações?</h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    O contexto que você fornecer será usado pela IA para analisar os "Tópicos-Chave Discutidos" 
                    e identificar "Aplicações Práticas" relevantes ao seu cenário específico de estágio.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default InternshipSetup;
