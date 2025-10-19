import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TeacherAccessCodeModalProps {
  isOpen: boolean;
  onValidationSuccess: () => void;
  teacherName: string;
}

export const TeacherAccessCodeModal = ({ 
  isOpen, 
  onValidationSuccess,
  teacherName 
}: TeacherAccessCodeModalProps) => {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleValidate = async () => {
    if (!code.trim()) {
      setError('Por favor, insira o código de acesso');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'validate-teacher-code',
        {
          body: { code: code.toUpperCase().trim() }
        }
      );

      if (functionError || data?.error) {
        throw new Error(data?.error || functionError?.message || 'Erro ao validar código');
      }

      toast.success('🎉 Código validado com sucesso!', {
        description: 'Bem-vindo ao sistema NextClass!'
      });

      onValidationSuccess();

    } catch (err: any) {
      console.error('Validation error:', err);
      setError(err.message);
      toast.error('Erro ao validar código', {
        description: err.message
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          
          <DialogTitle className="text-center text-xl">
            Validação de Acesso - Professor
          </DialogTitle>
          
          <DialogDescription className="text-center space-y-2">
            <p className="text-base">
              Olá, <strong>{teacherName}</strong>!
            </p>
            <p className="text-sm text-muted-foreground">
              Para acessar a plataforma NextClass como professor, você precisa inserir um <strong>código único de acesso</strong> fornecido pela administração.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="access-code">Código de Acesso</Label>
            <Input
              id="access-code"
              placeholder="TEACH-AFYA-2024-XXXXXX"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              className="font-mono text-center text-lg tracking-wider"
              maxLength={30}
              disabled={isValidating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isValidating) {
                  handleValidate();
                }
              }}
            />
            <p className="text-xs text-muted-foreground text-center">
              Insira o código exatamente como recebeu
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="animate-in slide-in-from-top-2">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              <strong>💡 Não tem um código?</strong><br />
              Entre em contato com a administração em: <br />
              <a href="mailto:heitor.mhm@gmail.com" className="underline font-medium">
                heitor.mhm@gmail.com
              </a>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleValidate}
            disabled={isValidating || !code.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Validar Código
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
