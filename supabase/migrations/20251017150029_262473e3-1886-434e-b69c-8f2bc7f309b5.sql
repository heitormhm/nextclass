-- Atualizar nome da faculdade em registros existentes
UPDATE public.turmas
SET faculdade = 'Centro Universitario Afya Montes Claros'
WHERE faculdade = 'Unifip-Moc';

-- Atualizar nome da faculdade na tabela users
UPDATE public.users
SET university = 'Centro Universitario Afya Montes Claros'
WHERE university = 'Unifip-Moc';

-- Alterar valor padrão da coluna faculdade
ALTER TABLE public.turmas
ALTER COLUMN faculdade SET DEFAULT 'Centro Universitario Afya Montes Claros';