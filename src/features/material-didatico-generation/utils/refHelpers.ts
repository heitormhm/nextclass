/**
 * Validações para refs do Material Generation
 */

export const validateRefReady = (
  ref: any
): { isValid: boolean; error?: string } => {
  if (!ref) {
    return { isValid: false, error: 'Ref is null or undefined' };
  }
  
  if (!ref.current) {
    return { isValid: false, error: 'Ref.current is null' };
  }
  
  if (typeof ref.current.triggerRegeneration !== 'function') {
    return { isValid: false, error: 'triggerRegeneration is not a function' };
  }
  
  return { isValid: true };
};

export const logRefState = (ref: any, context: string) => {
  console.log(`[${context}] Ref diagnostic:`, {
    refExists: !!ref,
    currentExists: !!ref?.current,
    hasTriggerFn: typeof ref?.current?.triggerRegeneration === 'function',
    refType: typeof ref,
    currentType: typeof ref?.current,
    timestamp: new Date().toISOString(),
  });
};
