-- PASSO 1: Adicionar 'admin' ao enum app_role
DO $$ 
BEGIN
  -- Adicionar 'admin' ao enum se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END $$;