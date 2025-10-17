-- Atualizar RLS policies de internship_locations para permitir visualização compartilhada
-- Todos podem ver todos os locais, mas apenas gerenciar (criar/atualizar) os próprios

-- Remover policy antiga que restringe visualização apenas ao próprio usuário
DROP POLICY IF EXISTS "Users can view own locations" ON public.internship_locations;

-- Criar policy que permite todos verem todos os locais
CREATE POLICY "All authenticated users can view all locations"
ON public.internship_locations
FOR SELECT
TO authenticated
USING (true);

-- Manter policy de gerenciamento apenas dos próprios
-- (já existe: "Users can manage own locations")

-- Adicionar policy de DELETE para internship_sessions
CREATE POLICY "Users can delete own sessions"
ON public.internship_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);