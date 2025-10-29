import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseMaterialRegenerationProps {
  onTrigger: () => void;
  validateConditions?: () => boolean;
}

/**
 * Hook para gerenciar regeneração de material com validação
 */
export const useMaterialRegeneration = ({
  onTrigger,
  validateConditions,
}: UseMaterialRegenerationProps) => {
  const { toast } = useToast();

  const triggerRegeneration = useCallback(() => {
    console.log('[Regeneration] Validating conditions...');
    
    // Validação customizada (opcional)
    if (validateConditions && !validateConditions()) {
      toast({
        variant: 'destructive',
        title: 'Não é possível regenerar',
        description: 'Condições não satisfeitas para regeneração.',
      });
      return;
    }
    
    console.log('[Regeneration] Conditions OK - triggering...');
    onTrigger();
  }, [onTrigger, validateConditions, toast]);

  return { triggerRegeneration };
};
