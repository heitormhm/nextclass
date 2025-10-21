import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';

const TeacherValidation: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error('Por favor, insira o código de acesso');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-teacher-code', {
        body: { code: code.trim() }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Código validado com sucesso!', {
          description: 'Redirecionando para o dashboard...'
        });
        
        // Wait a moment before redirecting to allow the auth context to update
        setTimeout(() => {
          navigate('/teacherdashboard', { replace: true });
        }, 1500);
      } else {
        toast.error('Código inválido', {
          description: data.message || 'Verifique o código e tente novamente.'
        });
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error('Erro ao validar código', {
        description: error.message || 'Tente novamente mais tarde.'
      });
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Validação de Professor</CardTitle>
          <CardDescription className="text-base">
            Para acessar as funcionalidades de professor, insira o código de acesso fornecido pela administração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Código de Acesso</Label>
              <Input
                id="code"
                type="text"
                placeholder="Digite o código"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
                className="text-center font-mono text-lg tracking-wider"
                maxLength={20}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Validar Código'
              )}
            </Button>

            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleSignOut}
                disabled={loading}
              >
                Sair e fazer login com outra conta
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Não tem um código?</p>
            <p>Entre em contato com a administração para obter seu código de acesso de professor.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherValidation;
