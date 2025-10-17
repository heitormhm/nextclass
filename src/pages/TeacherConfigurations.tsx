import React, { useState } from 'react';
import { Settings, Bell, Video, Globe, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MainLayout from '@/components/MainLayout';
import { toast } from '@/hooks/use-toast';

const TeacherConfigurations = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    weeklyReport: false,
    videoQuality: '1080p',
    transcriptionLanguage: 'pt-BR'
  });

  const handleSwitchChange = (field: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    toast({
      title: "Sucesso",
      description: "Configurações salvas com sucesso!",
      variant: "default"
    });
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Configurações da Conta
            </h1>
            <p className="text-white/80 text-lg">
              Personalize suas preferências e configurações do sistema
            </p>
          </div>

          <div className="space-y-6">
            {/* Notification Settings */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações
                </CardTitle>
                <CardDescription>
                  Configure como e quando você deseja receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="email-notifications">Receber email sobre novas avaliações</Label>
                    <p className="text-sm text-gray-500">
                      Seja notificado quando novos quizzes ou avaliações forem submetidos
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={(value) => handleSwitchChange('emailNotifications', value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="weekly-report">Resumo semanal de desempenho da turma</Label>
                    <p className="text-sm text-gray-500">
                      Receba um relatório semanal com estatísticas da turma
                    </p>
                  </div>
                  <Switch
                    id="weekly-report"
                    checked={settings.weeklyReport}
                    onCheckedChange={(value) => handleSwitchChange('weeklyReport', value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recording Settings */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Gravação
                </CardTitle>
                <CardDescription>
                  Configure as preferências padrão para gravação de aulas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="video-quality">Qualidade de vídeo padrão</Label>
                  <Select 
                    value={settings.videoQuality} 
                    onValueChange={(value) => handleSelectChange('videoQuality', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a qualidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p (HD)</SelectItem>
                      <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                      <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Language Settings */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Idioma
                </CardTitle>
                <CardDescription>
                  Configure o idioma padrão para transcrições e interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="transcription-language">Idioma padrão da transcrição</Label>
                  <Select 
                    value={settings.transcriptionLanguage} 
                    onValueChange={(value) => handleSelectChange('transcriptionLanguage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Salvar Configurações
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TeacherConfigurations;