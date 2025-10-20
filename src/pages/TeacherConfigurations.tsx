import React, { useState, useEffect } from 'react';
import { Settings, Bell, Video, Globe, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const TeacherConfigurations = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    weeklyReport: false,
    videoQuality: '1080p',
    transcriptionLanguage: 'pt-BR'
  });

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('email_notifications, weekly_report_enabled, video_quality, transcription_language')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setSettings({
          emailNotifications: data.email_notifications ?? true,
          weeklyReport: data.weekly_report_enabled ?? false,
          videoQuality: data.video_quality ?? '1080p',
          transcriptionLanguage: data.transcription_language ?? 'pt-BR'
        });
      }
      setLoading(false);
    };
    
    fetchUserSettings();
  }, [user?.id]);

  const handleSwitchChange = (field: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          email_notifications: settings.emailNotifications,
          weekly_report_enabled: settings.weeklyReport,
          video_quality: settings.videoQuality,
          transcription_language: settings.transcriptionLanguage
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500 animate-gradient-xy bg-[length:200%_200%]">
        <TeacherBackgroundRipple />
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Configurações da Conta
            </h1>
            <p className="text-white/80 text-lg">
              Personalize suas preferências e configurações do sistema
            </p>
          </div>

          {loading ? (
            <div className="space-y-6">
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notification Settings */}
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)] md:col-span-2">
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

            {/* Language Settings */}
            <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
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
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default TeacherConfigurations;