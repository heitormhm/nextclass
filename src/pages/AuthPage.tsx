import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthBackgroundRipple } from '@/components/ui/auth-background-ripple';
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
  const [turmas, setTurmas] = useState<any[]>([]);
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(true);
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const loginForm = useForm<LoginFormData>();
  const signupForm = useForm<SignupFormData>({
    defaultValues: {
      course: 'Engenharia',
      university: 'Centro Universitário Afya Montes Claros',
      city: 'Montes Claros - MG'
    }
  });

  // Fetch turmas on component mount
  useEffect(() => {
    const fetchTurmas = async () => {
      setIsLoadingTurmas(true);
      try {
        const { data, error } = await supabase
          .from('turmas')
          .select('faculdade, cidade, periodo, curso')
          .order('periodo', { ascending: true });
        
        if (error) {
          console.error('Error fetching turmas:', error);
          toast.error('Erro ao carregar dados das turmas');
          return;
        }
        
        setTurmas(data || []);
        
        // Pré-selecionar faculdade e cidade
        if (data && data.length > 0) {
          const afyaMC = data.find(t => t.faculdade === 'Centro Universitário Afya Montes Claros');
          
          if (afyaMC) {
            signupForm.setValue('university', afyaMC.faculdade);
            signupForm.setValue('city', afyaMC.cidade);
          } else {
            // Fallback: primeira faculdade disponível
            signupForm.setValue('university', data[0].faculdade);
            signupForm.setValue('city', data[0].cidade);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setIsLoadingTurmas(false);
      }
    };
    
    fetchTurmas();
  }, [signupForm]);

  // Get unique values for dropdowns
  const uniqueFaculdades = useMemo(() => {
    return Array.from(new Set(turmas.map(t => t.faculdade))).filter(Boolean);
  }, [turmas]);

  const uniquePeriodos = useMemo(() => {
    return Array.from(new Set(turmas.map(t => t.periodo)))
      .filter(Boolean)
      .sort((a, b) => parseInt(a) - parseInt(b));
  }, [turmas]);

  const uniqueCidades = useMemo(() => {
    return Array.from(new Set(turmas.map(t => t.cidade))).filter(Boolean);
  }, [turmas]);

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
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (userError) {
        toast.error('Erro ao buscar dados do usuário');
        return;
      }

      // Redirect based on actual user role from database
      if (userData?.role === 'teacher') {
        navigate('/teacherdashboard', { replace: true });
      } else {
        // Auto-enroll student if not already enrolled
        try {
          await supabase.functions.invoke('auto-enroll-student', {
            body: { userId: authData.user.id }
          });
        } catch (enrollError) {
          console.error('Error auto-enrolling student on login:', enrollError);
          // Don't block login if enrollment fails
        }
        
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

    if (!data.university) {
      signupForm.setError('university', { message: 'Selecione sua faculdade' });
      return;
    }
    
    if (selectedRole === 'student' && !data.period) {
      signupForm.setError('period', { message: 'Selecione seu período atual' });
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

      // Auto-enroll student in turma
      if (selectedRole === 'student' && authData.user) {
        try {
          await supabase.functions.invoke('auto-enroll-student', {
            body: { userId: authData.user.id }
          });
        } catch (enrollError) {
          console.error('Error auto-enrolling student:', enrollError);
          // Don't block registration if enrollment fails
        }
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
    <div className="min-h-screen bg-background relative">
      {/* ========== LAYER 1: BACKGROUND FULLSCREEN ========== */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Blobs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-40 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full opacity-30 blur-3xl"></div>
        
        {/* Background Ripple Effect */}
        <AuthBackgroundRipple />
      </div>

      {/* ========== LAYER 2: CONTENT CONTAINER ========== */}
      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        {/* Left Panel - Modern Interactive Background (Desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center items-start p-12 text-slate-800 animate-fade-in">
            <div className="max-w-md">
              <div className="mb-6 drop-shadow-md group cursor-pointer">
                <img 
                  src="/src/assets/nextclass-logo.svg" 
                  alt="NEXTCLASS" 
                  className="h-16 w-auto transition-all duration-300 ease-out group-hover:scale-110 group-hover:drop-shadow-xl"
                />
              </div>
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
        <div className="flex-1 lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative">
          {/* Glassmorphism Overlay */}
          <div className="absolute inset-0 bg-white/30 backdrop-blur-md"></div>
          
          {/* Content acima do overlay */}
          <div className="relative z-10 w-full max-w-md space-y-6 sm:space-y-8">
            {/* Mobile Header */}
            <div className="text-center lg:hidden py-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">NEXTCLASS</h1>
              <p className="text-sm sm:text-base text-foreground-muted">Plataforma de engenharia com IA</p>
            </div>

            <Card className="shadow-2xl border border-white/50 bg-white/90 backdrop-blur-xl transition-all duration-500 ease-out hover:scale-[1.02] hover:shadow-[0_30px_60px_-15px_rgba(236,72,153,0.4)] hover:-translate-y-1">
              <CardHeader className="space-y-4 pb-6">
                {/* Role Selection Tabs - Only shown during signup */}
                {!isLogin && (
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
                )}

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
                  /* Signup Form - Multi-Step */
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-foreground">Etapa {step} de {totalSteps}</span>
                        <span className="text-xs text-muted-foreground">
                          {step === 1 && 'Dados Pessoais'}
                          {step === 2 && 'Dados Acadêmicos'}
                          {step === 3 && 'Segurança'}
                        </span>
                      </div>
                      <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500 ease-out"
                          style={{ width: `${(step / totalSteps) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Step 1: Dados Pessoais */}
                    {step === 1 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name" className="text-sm font-medium">
                            Nome Completo
                          </Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder={selectedRole === 'teacher' ? "Prof. João Silva" : "Maria Santos"}
                            {...signupForm.register('fullName', {
                              required: 'Nome completo é obrigatório',
                              minLength: { value: 2, message: 'Nome deve ter pelo menos 2 caracteres' }
                            })}
                            className="transition-all duration-200 focus:ring-primary focus:border-primary hover:border-primary/30"
                          />
                          {signupForm.formState.errors.fullName && (
                            <p className="text-sm text-destructive animate-in slide-in-from-left-1">
                              {signupForm.formState.errors.fullName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-email" className="text-sm font-medium">
                            Email
                          </Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="seu@email.com"
                            {...signupForm.register('email', {
                              required: 'Email é obrigatório',
                              validate: validateEmail
                            })}
                            className="transition-all duration-200 focus:ring-primary focus:border-primary hover:border-primary/30"
                          />
                          {signupForm.formState.errors.email && (
                            <p className="text-sm text-destructive animate-in slide-in-from-left-1">
                              {signupForm.formState.errors.email.message}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            Use qualquer email válido para criar sua conta
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-phone" className="text-sm font-medium">
                            Telefone de Contato
                          </Label>
                          <Input
                            id="signup-phone"
                            type="tel"
                            placeholder="(38) 99999-9999"
                            {...signupForm.register('phone', {
                              required: 'Telefone é obrigatório',
                              pattern: {
                                value: /^[\d\s\-\(\)]+$/,
                                message: 'Formato inválido. Use: (38) 99999-9999'
                              }
                            })}
                            className="transition-all duration-200 focus:ring-primary focus:border-primary hover:border-primary/30"
                          />
                          {signupForm.formState.errors.phone && (
                            <p className="text-sm text-destructive animate-in slide-in-from-left-1">
                              {signupForm.formState.errors.phone.message}
                            </p>
                          )}
                        </div>

                        <Button 
                          type="button" 
                          onClick={async () => {
                            const isValid = await signupForm.trigger(['fullName', 'email', 'phone']);
                            if (isValid) setStep(2);
                          }}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 transition-all duration-200"
                        >
                          Próximo →
                        </Button>
                      </div>
                    )}

                    {/* Step 2: Dados Acadêmicos */}
                    {step === 2 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="signup-university" className="text-sm font-medium">
                            {selectedRole === 'teacher' ? 'Instituição de Ensino' : 'Sua Faculdade'}
                          </Label>
                          <Select
                            defaultValue="Centro Universitário Afya Montes Claros"
                            value={signupForm.watch('university') || 'Centro Universitário Afya Montes Claros'}
                            onValueChange={(value) => {
                              signupForm.setValue('university', value);
                              const selectedTurma = turmas.find(t => t.faculdade === value);
                              if (selectedTurma) {
                                signupForm.setValue('city', selectedTurma.cidade);
                              }
                            }}
                            disabled={isLoadingTurmas}
                          >
                            <SelectTrigger className="w-full transition-all duration-200 hover:border-primary/50 focus:ring-primary">
                              <SelectValue placeholder={isLoadingTurmas ? "Carregando..." : "Centro Universitário Afya Montes Claros"} />
                            </SelectTrigger>
                            <SelectContent>
                              {uniqueFaculdades.map((faculdade) => (
                                <SelectItem key={faculdade} value={faculdade}>
                                  {faculdade}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {signupForm.formState.errors.university && (
                            <p className="text-sm text-destructive animate-in slide-in-from-left-1">
                              {signupForm.formState.errors.university.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-city" className="text-sm font-medium">
                            Localização do Campus
                          </Label>
                          <Input
                            id="signup-city"
                            type="text"
                            {...signupForm.register('city')}
                            disabled
                            placeholder="Será preenchido automaticamente"
                            className="transition-all duration-200 bg-slate-50/80 text-slate-700 border-slate-200"
                          />
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Preenchido automaticamente ao selecionar a faculdade
                          </p>
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
                            <Label htmlFor="signup-period" className="text-sm font-medium">
                              Período/Semestre Atual
                            </Label>
                            <Select
                              onValueChange={(value) => signupForm.setValue('period', value)}
                              disabled={isLoadingTurmas}
                            >
                              <SelectTrigger className="w-full transition-all duration-200 hover:border-primary/50 focus:ring-primary">
                                <SelectValue placeholder={isLoadingTurmas ? "Carregando..." : "Ex: 3º Período"} />
                              </SelectTrigger>
                              <SelectContent>
                                {uniquePeriodos.map((periodo) => (
                                  <SelectItem key={periodo} value={periodo.toString()}>
                                    {periodo}º Período
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {signupForm.formState.errors.period && (
                              <p className="text-sm text-destructive animate-in slide-in-from-left-1">
                                {signupForm.formState.errors.period.message}
                              </p>
                            )}
                            <p className="text-xs text-slate-500">
                              Seu período será usado para personalizar seus conteúdos
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setStep(1)}
                            className="w-1/3"
                          >
                            ← Voltar
                          </Button>
                          <Button 
                            type="button" 
                            onClick={async () => {
                              const fields = selectedRole === 'student' 
                                ? (['university', 'city', 'course', 'period'] as const)
                                : (['university', 'city', 'course'] as const);
                              const isValid = await signupForm.trigger(fields as any);
                              if (isValid) setStep(3);
                            }}
                            className="w-2/3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                          >
                            Próximo →
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Segurança */}
                    {step === 3 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
                          <ul className="text-xs text-slate-500 space-y-1 mt-2">
                            <li className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Mínimo 8 caracteres
                            </li>
                            <li className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              1 número, 1 caractere especial
                            </li>
                          </ul>
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

                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setStep(2)}
                            className="w-1/3"
                          >
                            ← Voltar
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-2/3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 transition-all duration-200"
                          >
                            {isLoading ? 'Cadastrando...' : '🚀 Cadastrar'}
                          </Button>
                        </div>
                      </div>
                    )}
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