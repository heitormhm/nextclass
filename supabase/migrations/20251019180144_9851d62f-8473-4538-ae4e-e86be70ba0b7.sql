-- Adicionar RLS policies para security_logs

-- Permitir que usuários autenticados insiram seus próprios logs de segurança
CREATE POLICY "Users can insert their own security logs"
ON public.security_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todos os logs de segurança
CREATE POLICY "Admins can view all security logs"
ON public.security_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));