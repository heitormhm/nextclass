-- Função para obter turmas disponíveis durante o signup (pode ser chamada sem autenticação)
CREATE OR REPLACE FUNCTION public.get_available_turmas()
RETURNS TABLE (
  faculdade text,
  cidade text,
  periodo text,
  curso text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT faculdade, cidade, periodo, curso
  FROM public.turmas
  WHERE faculdade = 'Centro Universitário Afya Montes Claros'
  ORDER BY faculdade, cidade, curso, periodo;
$$;

-- Permitir acesso público à função (anon = não autenticados, authenticated = autenticados)
GRANT EXECUTE ON FUNCTION public.get_available_turmas() TO anon, authenticated;