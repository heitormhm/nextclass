-- FASE 1: Atualizar dados dos estudantes na tabela users
-- Atualizar Heitor para Centro Universitário Afya Montes Claros
UPDATE users
SET 
  university = 'Centro Universitário Afya Montes Claros',
  city = 'Montes Claros - MG',
  updated_at = now()
WHERE id = '6bd8e59a-ff40-4e17-ab90-5c68b2c4881b';

-- Atualizar Laurent para Centro Universitário Afya Montes Claros
UPDATE users
SET 
  university = 'Centro Universitário Afya Montes Claros',
  updated_at = now()
WHERE id = '57f93b4c-766f-4f63-9516-10fbe7163cc9';

-- FASE 2: Criar turmas corretas no sistema
-- Criar turma correta para o 6º período (Heitor)
INSERT INTO turmas (nome_turma, curso, periodo, faculdade, cidade)
VALUES (
  'Engenharia - 6º Período - Centro Universitário Afya Montes Claros',
  'Engenharia',
  '6',
  'Centro Universitário Afya Montes Claros',
  'Montes Claros - MG'
)
ON CONFLICT DO NOTHING;

-- Criar turma correta para o 1º período (Laurent)
INSERT INTO turmas (nome_turma, curso, periodo, faculdade, cidade)
VALUES (
  'Engenharia - 1º Período - Centro Universitário Afya Montes Claros',
  'Engenharia',
  '1',
  'Centro Universitário Afya Montes Claros',
  'Montes Claros - MG'
)
ON CONFLICT DO NOTHING;

-- FASE 3: Migrar enrollments para as turmas corretas
-- Migrar enrollment do Heitor (6º período)
UPDATE turma_enrollments
SET 
  turma_id = (
    SELECT id FROM turmas 
    WHERE curso = 'Engenharia' 
      AND periodo = '6' 
      AND faculdade = 'Centro Universitário Afya Montes Claros'
    LIMIT 1
  ),
  enrolled_at = now()
WHERE aluno_id = '6bd8e59a-ff40-4e17-ab90-5c68b2c4881b';

-- Migrar enrollment do Laurent (1º período)
UPDATE turma_enrollments
SET 
  turma_id = (
    SELECT id FROM turmas 
    WHERE curso = 'Engenharia' 
      AND periodo = '1' 
      AND faculdade = 'Centro Universitário Afya Montes Claros'
    LIMIT 1
  ),
  enrolled_at = now()
WHERE aluno_id = '57f93b4c-766f-4f63-9516-10fbe7163cc9';

-- FASE 4: Deletar turmas antigas (limpeza)
-- Deletar turma antiga do Heitor (FipMoc)
DELETE FROM turmas
WHERE id = '51eaa20f-fb61-4733-9b0a-d2c0be96d796';

-- Deletar turma antiga do Laurent (Unifip-Moc)
DELETE FROM turmas
WHERE id = '97f6fe10-4467-43a1-9d6d-898adcf8a5c2';