import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  
  const loginForm = useForm<LoginFormData>();
  const signupForm = useForm<SignupFormData>({
    defaultValues: {
      course: 'Engenharia'
    }
  });

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

  const onLoginSubmit = (data: LoginFormData) => {
    console.log('Login attempt:', data, 'Role:', selectedRole);
    // Redirect based on selected role
    if (selectedRole === 'teacher') {
      window.location.href = '/teacherdashboard';
    } else {
      window.location.href = '/dashboard';
    }
  };

  const onSignupSubmit = (data: SignupFormData) => {
    if (data.password !== data.confirmPassword) {
      signupForm.setError('confirmPassword', { message: 'Senhas não coincidem' });
      return;
    }
    
    if (selectedRole === 'student' && !data.period) {
      signupForm.setError('period', { message: 'Período é obrigatório para alunos' });
      return;
    }
    
    console.log('Signup attempt:', { ...data, role: selectedRole });
    // TODO: Implement registration logic with Supabase
  };


  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Panel - Animated Gradient with Geometric Lines (Desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-pink-500 via-purple-600 to-purple-800">
          {/* Animated Geometric Lines Overlay */}
          <svg 
            className="absolute inset-0 w-full h-full opacity-30"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Diagonal lines */}
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(255,255,255,0.3)" strokeWidth="1" className="animate-float" style={{ animationDelay: '0s' }} />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="rgba(255,255,255,0.2)" strokeWidth="1" className="animate-float" style={{ animationDelay: '1s' }} />
            
            {/* Circuit-like patterns */}
            <circle cx="20%" cy="20%" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" className="animate-float" style={{ animationDelay: '2s' }} />
            <circle cx="80%" cy="30%" r="60" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" className="animate-float" style={{ animationDelay: '3s' }} />
            <circle cx="30%" cy="70%" r="50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" className="animate-float" style={{ animationDelay: '4s' }} />
            <circle cx="70%" cy="80%" r="35" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" className="animate-float" style={{ animationDelay: '5s' }} />
            
            {/* Connecting lines */}
            <path d="M 20% 20% L 30% 70%" stroke="rgba(255,255,255,0.2)" strokeWidth="1" className="animate-float" style={{ animationDelay: '1.5s' }} />
            <path d="M 80% 30% L 70% 80%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" className="animate-float" style={{ animationDelay: '2.5s' }} />
            <path d="M 30% 70% L 70% 80%" stroke="rgba(255,255,255,0.2)" strokeWidth="1" className="animate-float" style={{ animationDelay: '3.5s' }} />
            
            {/* Grid pattern */}
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </svg>

          {/* Glowing dots */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.8)]"></div>
          <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2s' }}></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center items-start p-12 text-white animate-fade-in">
            <div className="max-w-md">
              <h1 className="text-6xl font-bold mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-100">NEXTCLASS</span>
              </h1>
              <p className="text-2xl font-medium mb-4 text-white/95">
                Bem-vindo à NEXTCLASS
              </p>
              <p className="text-lg text-white/80 leading-relaxed">
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
                      className="w-full bg-primary hover:bg-primary-light text-primary-foreground font-medium py-2.5 transition-all duration-200"
                    >
                      Entrar
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
                      className="w-full bg-primary hover:bg-primary-light text-primary-foreground font-medium py-2.5 transition-all duration-200"
                    >
                      Cadastrar
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