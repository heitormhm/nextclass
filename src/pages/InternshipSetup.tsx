import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mic, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import { toast } from 'sonner';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { supabase } from '@/integrations/supabase/client';

const InternshipSetup = () => {
  const navigate = useNavigate();
  const [internshipType, setInternshipType] = useState('');
  const [location, setLocation] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewTags, setPreviewTags] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [errors, setErrors] = useState({ internshipType: '', location: '' });

  // Generate tags preview when internship type changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internshipType.trim().length >= 3) {
        generateTagsPreview();
      } else {
        setPreviewTags([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [internshipType, locationDetails]);

  const generateTagsPreview = async () => {
    setIsGeneratingTags(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-internship-tags', {
        body: { 
          internshipType,
          locationDetails: locationDetails || location
        }
      });

      if (error) throw error;
      setPreviewTags(data.tags || []);
    } catch (error) {
      console.error('Error generating tags preview:', error);
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const validateForm = () => {
    const newErrors = { internshipType: '', location: '' };
    let isValid = true;

    if (!internshipType.trim()) {
      newErrors.internshipType = 'Tipo de estágio é obrigatório';
      isValid = false;
    } else if (internshipType.trim().length < 3) {
      newErrors.internshipType = 'Digite pelo menos 3 caracteres';
      isValid = false;
    }

    if (!location.trim()) {
      newErrors.location = 'Local do estágio é obrigatório';
      isValid = false;
    } else if (location.trim().length < 3) {
      newErrors.location = 'Digite pelo menos 3 caracteres';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleStartRecording = () => {
    if (!validateForm()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    setIsSubmitting(true);

    // Navigate to recording page with context data
    navigate('/internship/record', {
      state: {
        internshipType: internshipType.trim(),
        location: location.trim(),
        locationDetails,
        previewTags
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
                  Em qual estágio você está? *
                </Label>
                <Input
                  id="internshipType"
                  placeholder="Ex: Estágio em Engenharia Civil, Engenharia Mecânica, Engenharia Elétrica, etc."
                  value={internshipType}
                  onChange={(e) => {
                    setInternshipType(e.target.value);
                    setErrors({ ...errors, internshipType: '' });
                  }}
                  className="text-base"
                  autoFocus
                />
                {errors.internshipType && (
                  <p className="text-sm text-destructive">{errors.internshipType}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {internshipType.length}/100 caracteres
                </p>
              </div>

              {/* Location Autocomplete */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-base font-medium">
                  Onde você está indo? *
                </Label>
                <LocationAutocomplete
                  value={location}
                  onChange={(name, details) => {
                    setLocation(name);
                    setLocationDetails(details || '');
                    setErrors({ ...errors, location: '' });
                  }}
                  placeholder="Digite o nome do local..."
                  error={errors.location}
                />
                <p className="text-xs text-muted-foreground">
                  Digite para ver sugestões de locais já utilizados
                </p>
              </div>

              {/* Tags Preview */}
              {previewTags.length > 0 && (
                <div className="p-4 bg-accent/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {isGeneratingTags ? 'Gerando tags...' : 'Tags que serão geradas'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewTags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  onClick={handleStartRecording}
                  disabled={isSubmitting || !internshipType.trim() || !location.trim()}
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
                <p className="text-xs text-muted-foreground">
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
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">Por que essas informações?</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O contexto que você fornecer será usado pela IA para analisar os "Tópicos-Chave Discutidos" 
                    e identificar "Aplicações Práticas" relevantes ao seu cenário específico de estágio.
                    As tags são geradas automaticamente para facilitar buscas futuras.
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
