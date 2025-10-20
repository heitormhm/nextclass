import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Camera, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import MainLayout from '@/components/MainLayout';
import { TeacherBackgroundRipple } from '@/components/ui/teacher-background-ripple';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const TeacherProfileSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: ''
  });
  const [profileImage, setProfileImage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfileData({
          fullName: data.full_name || '',
          email: data.email || ''
        });
        setProfileImage(data.avatar_url || '');
      }
      setLoading(false);
    };
    
    fetchUserProfile();
  }, [user?.id]);

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Formato inválido. Use JPG, PNG ou WEBP.",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);
      
      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setProfileImage(publicUrl);
      toast({
        title: "Sucesso",
        description: "Foto atualizada com sucesso!",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro",
        description: "Falha ao fazer upload da imagem.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    // Validate full name
    if (profileData.fullName.trim().length < 3) {
      toast({
        title: "Erro",
        description: "Nome completo deve ter no mínimo 3 caracteres.",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      toast({
        title: "Erro",
        description: "Email inválido.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // Update profile data
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: profileData.fullName.trim(),
          email: profileData.email.trim()
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar o perfil.",
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
              Meu Perfil
            </h1>
            <p className="text-white/80 text-lg">
              Gerencie suas informações pessoais e configurações de conta
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)] h-fit">
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Picture */}
              <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)] h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Foto do Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <Avatar className="w-32 h-32 mx-auto mb-4">
                      <AvatarImage src={profileImage} alt="Profile" />
                      <AvatarFallback className="text-2xl bg-primary text-white">
                        {profileData.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="profile-image"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <Label htmlFor="profile-image">
                      <Button asChild className="cursor-pointer" disabled={uploading}>
                        <span>
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              Alterar Foto
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <p className="text-xs text-gray-500 mt-2">Máx. 5MB (JPG, PNG, WEBP)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information */}
                <Card className="bg-white/75 bg-blend-overlay backdrop-blur-xl border-blue-100/30 shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informações Pessoais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">Nome Completo</Label>
                      <Input
                        id="fullName"
                        value={profileData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        placeholder="Digite seu nome completo"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email de Contato</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Digite seu email"
                      />
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 border border-border mt-4">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Para alterar sua senha, acesse a página de <span className="font-medium text-foreground">Configurações</span>
                      </p>
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
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default TeacherProfileSettings;
