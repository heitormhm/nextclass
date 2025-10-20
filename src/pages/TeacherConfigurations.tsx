import React, { useState, useEffect } from 'react';
import { Bell, Globe, Save, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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

    // Validate password fields if any are filled
    if (passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword) {
      if (!passwordData.currentPassword) {
        toast({
          title: "Erro de validação",
          description: "Por favor, insira sua senha atual.",
          variant: "destructive",
        });
        return;
      }

      if (!passwordData.newPassword) {
        toast({
          title: "Erro de validação",
          description: "Por favor, insira uma nova senha.",
          variant: "destructive",
        });
        return;
      }

      if (passwordData.newPassword.length < 6) {
        toast({
          title: "Erro de validação",
          description: "A nova senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast({
          title: "Erro de validação",
          description: "As senhas não coincidem.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setSaving(true);
    
    try {
      // Update settings
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

      // Update password if provided
      if (passwordData.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: passwordData.newPassword
        });

        if (passwordError) throw passwordError;

        // Clear password fields after successful update
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        toast({
          title: "Sucesso",
          description: "Configurações e senha atualizadas com sucesso!",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso!",
        });
      }
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
              {/* Notification Settings - Full Width */}
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)] md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
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
                    <p className="text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
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

            {/* Security Settings */}
            <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Segurança
                </CardTitle>
                <CardDescription>
                  Altere sua senha de acesso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Digite sua senha atual"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Digite sua nova senha"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirme sua nova senha"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Language Settings */}
            <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
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

              {/* Save Button - Full Width Bottom */}
              <div className="md:col-span-2 flex justify-end">
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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