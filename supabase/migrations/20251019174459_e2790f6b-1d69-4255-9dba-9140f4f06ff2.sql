-- Criar tabela de códigos de acesso para professores
CREATE TABLE public.teacher_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  
  -- Status do código
  is_used boolean DEFAULT false,
  used_by_teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  
  -- Auditoria
  created_by_admin_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  
  -- Metadados
  notes text,
  batch_id uuid
);

-- Índices para performance
CREATE INDEX idx_teacher_codes_unused ON public.teacher_access_codes(is_used) WHERE is_used = false;
CREATE INDEX idx_teacher_codes_created_by ON public.teacher_access_codes(created_by_admin_id);

-- Habilitar RLS
ALTER TABLE public.teacher_access_codes ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode criar códigos
CREATE POLICY "Admin can create codes"
ON public.teacher_access_codes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' = 'heitor.mhm@gmail.com'
);

-- Admin pode ver todos os códigos
CREATE POLICY "Admin can view all codes"
ON public.teacher_access_codes
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'heitor.mhm@gmail.com'
);

-- Adicionar colunas de validação em user_roles
ALTER TABLE public.user_roles
ADD COLUMN is_validated boolean DEFAULT false,
ADD COLUMN validated_at timestamp with time zone,
ADD COLUMN validation_code_id uuid REFERENCES public.teacher_access_codes(id);

-- Atualizar professores existentes como validados (para não bloquear acesso atual)
UPDATE public.user_roles
SET is_validated = true
WHERE role = 'teacher';