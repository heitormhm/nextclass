-- PASSO 2: Criar função is_admin e atualizar usuário
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Atualizar o usuário heitor.mhm@gmail.com para admin
UPDATE public.user_roles
SET role = 'admin', is_validated = true, updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'heitor.mhm@gmail.com'
);

-- Atualizar RLS policies de teacher_access_codes
DROP POLICY IF EXISTS "Admin can create codes" ON public.teacher_access_codes;
DROP POLICY IF EXISTS "Admin can view all codes" ON public.teacher_access_codes;

CREATE POLICY "Admin can create codes"
ON public.teacher_access_codes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin can view all codes"
ON public.teacher_access_codes
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));