import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  university: string;
  city: string;
  course: string;
  period?: string; // Only for students
}

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const loginForm = useForm<LoginFormData>();
  const signupForm = useForm<SignupFormData>({
    defaultValues: {
      course: 'Engenharia'
    }
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) || 'Email inválido';
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return 'Senha deve ter pelo menos 8 caracteres';
    if (!/(?=.*[0-9])/.test(password)) return 'Senha deve conter pelo menos 1 número';
    if (!/(?=.*[!@#$%^&*])/.test(password)) return 'Senha deve conter pelo menos 1 caractere especial';
    return true;
  };

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Get user role from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        toast.error('Erro ao buscar dados do usuário');
        return;
      }

      // Redirect based on actual user role from database
      if (userData.role === 'teacher') {
        navigate('/teacherdashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }

      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormData) => {
    if (data.password !== data.confirmPassword) {
      signupForm.setError('confirmPassword', { message: 'Senhas não coincidem' });
      return;
    }
    
    if (selectedRole === 'student' && !data.period) {
      signupForm.setError('period', { message: 'Período é obrigatório para alunos' });
      return;
    }
    
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.fullName,
            phone: data.phone,
            university: data.university,
            city: data.city,
            course: data.course,
            period: data.period || '',
            role: selectedRole,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('Cadastro realizado com sucesso! Redirecionando...');
      
      // Redirect based on selected role
      setTimeout(() => {
        if (selectedRole === 'teacher') {
          navigate('/teacherdashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 1000);
    } catch (error: any) {
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Panel - Modern Interactive Background (Desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-50">
          {/* Gradient Blobs */}
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-40 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full opacity-30 blur-3xl"></div>
          
          {/* Background Ripple Effect */}
          <BackgroundRippleEffect />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center items-start p-12 text-slate-800 animate-fade-in">
            <div className="max-w-md">
              <h1 className="text-6xl font-bold mb-6 drop-shadow-sm">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">NEXTCLASS</span>
              </h1>
              <p className="text-2xl font-medium mb-4 text-slate-800">
                Bem-vindo à NEXTCLASS
              </p>
              <p className="text-lg text-slate-700 leading-relaxed">
                A plataforma de engenharia que transforma seu modo de aprender. O futuro começa agora.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Authentication Form */}
        <div className="flex-1 lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12">
          <div className="w-full max-w-md space-y-6 sm:space-y-8">
            {/* Mobile Header */}
            <div className="text-center lg:hidden py-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">NEXTCLASS</h1>
              <p className="text-sm sm:text-base text-foreground-muted">Plataforma de engenharia com IA</p>
            </div>

            <Card className="shadow-lg border-0 bg-card">
              <CardHeader className="space-y-4 pb-6">
                {/* Role Selection Tabs - Touch-friendly */}
                <div className="flex border border-border rounded-lg p-1 bg-background">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    className={`flex-1 py-3 px-4 text-sm sm:text-base font-medium rounded-md transition-all duration-200 min-h-[44px] ${
                      selectedRole === 'student'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground-muted hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    Sou Aluno
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('teacher')}
                    className={`flex-1 py-3 px-4 text-sm sm:text-base font-medium rounded-md transition-all duration-200 min-h-[44px] ${
                      selectedRole === 'teacher'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground-muted hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    Sou Professor
                  </button>
                </div>

                <CardTitle className="text-2xl font-bold text-center">
                  {isLogin ? 'Fazer Login' : 'Criar Conta'}
                </CardTitle>
                <CardDescription className="text-center text-foreground-muted">
                  {isLogin 
                    ? 'Acesse sua conta para continuar seus estudos' 
                    : 'Crie sua conta e comece a aprender hoje'
                  }
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {isLogin ? (
                  /* Login Form */
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        {...loginForm.register('email', {
                          required: 'Email é obrigatório',
                          validate: validateEmail
                        })}
                        className="transition-all duration-200 focus:ring-primary focus:border-primary"
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Sua senha"
                        {...loginForm.register('password', {
                          required: 'Senha é obrigatória'
                        })}
                        className="transition-all duration-200 focus:ring-primary focus:border-primary"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="text-sm text-primary hover:text-primary-light transition-colors"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-primary hover:bg-primary-light text-primary-foreground font-medium py-2.5 transition-all duration-200"
                    >
                      {isLoading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
                ) : (
                  /* Signup Form */
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome Completo</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome completo"
                        {...signupForm.register('fullName', {
                          required: 'Nome completo é obrigatório',
                          minLength: { value: 2, message: 'Nome deve ter pelo menos 2 caracteres' }
                        })}
                        className="transition-all duration-200 focus:ring-primary focus:border-primary"
                      />
                      {signupForm.formState.errors.fullName && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        {...signupForm.register('email', {
                          required: 'Email é obrigatório',
                          validate: validateEmail
                        })}
                        className="transition-all duration-200 focus:ring-primary focus:border-primary"
                      />
                      {signupForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Telefone</Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        {...signupForm.register('phone', {
                          required: 'Telefone é obrigatório',
                          pattern: {
                            value: /^[\d\s\-\(\)]+$/,
                            message: 'Telefone inválido'
                          }
                        })}
                        className="transition-all duration-200 focus:ring-primary focus:border-primary"
                      />
                      {signupForm.formState.errors.phone && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-university">Qual faculdade você faz parte?</Label>
                      <Input
                        id="signup-university"
                        type="text"
                        placeholder="Nome da instituição"
                        {...signupForm.register('university', {
                          required: 'Faculdade é obrigatória'
                        })}
                        className="transition-all duration-200 focus:ring-primary focus:border-primary"
                      />
                      {signupForm.formState.errors.university && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.university.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-city">Cidade da faculdade</Label>
                      <Input
                        id="signup-city"
                        type="text"
                        placeholder="Cidade"
                        {...signupForm.register('city', {
                          required: 'Cidade é obrigatória'
                        })}
                        className="transition-all duration-200 focus:ring-primary focus:border-primary"
                      />
                      {signupForm.formState.errors.city && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.city.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-course">Curso</Label>
                      <Input
                        id="signup-course"
                        type="text"
                        value="Engenharia"
                        disabled
                        {...signupForm.register('course')}
                        className="transition-all duration-200 bg-muted"
                      />
                      <p className="text-xs text-foreground-muted">Apenas Engenharia disponível no MVP</p>
                    </div>

                    {selectedRole === 'student' && (
                      <div className="space-y-2">
                        <Label htmlFor="signup-period">Período que está cursando</Label>
                        <Select
                          onValueChange={(value) => signupForm.setValue('period', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o período" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((period) => (
                              <SelectItem key={period} value={period.toString()}>
                                {period}º Período
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {signupForm.formState.errors.period && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.period.message}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        {...signupForm.register('password', {
                          required: 'Senha é obrigatória',
                          validate: validatePassword
                        })}
                        className="transition-all duration-200 focus:ring-primary focus:border-primary"
                      />
                      {signupForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="Confirme sua senha"
                        {...signupForm.register('confirmPassword', {
                          required: 'Confirmação de senha é obrigatória'
                        })}
                        className="transition-all duration-200 focus:ring-primary focus:border-primary"
                      />
                      {signupForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-primary hover:bg-primary-light text-primary-foreground font-medium py-2.5 transition-all duration-200"
                    >
                      {isLoading ? 'Cadastrando...' : 'Cadastrar'}
                    </Button>
                  </form>
                )}

                {/* Toggle between Login/Signup */}
                <div className="text-center pt-4">
                  <p className="text-sm text-foreground-muted">
                    {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-primary hover:text-primary-light font-medium transition-colors"
                    >
                      {isLogin ? 'Cadastre-se' : 'Faça login'}
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;