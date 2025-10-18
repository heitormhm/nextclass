-- FASE 1: Criar turmas automaticamente para usuários existentes com período definido
INSERT INTO turmas (nome_turma, curso, periodo, faculdade, cidade)
SELECT DISTINCT
  u.course || ' - ' || u.period || 'º Período - ' || u.university AS nome_turma,
  u.course,
  u.period,
  u.university,
  u.city
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'student'
  AND u.period IS NOT NULL 
  AND u.period != ''
  AND NOT EXISTS (
    SELECT 1 FROM turmas t 
    WHERE t.curso = u.course 
      AND t.periodo = u.period 
      AND t.faculdade = u.university
  )
ON CONFLICT DO NOTHING;

-- Criar enrollments para esses alunos
INSERT INTO turma_enrollments (aluno_id, turma_id)
SELECT DISTINCT
  u.id AS aluno_id,
  t.id AS turma_id
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN turmas t ON (
  t.curso = u.course 
  AND t.periodo = u.period 
  AND t.faculdade = u.university
)
WHERE ur.role = 'student'
  AND u.period IS NOT NULL 
  AND u.period != ''
  AND NOT EXISTS (
    SELECT 1 FROM turma_enrollments te 
    WHERE te.aluno_id = u.id 
      AND te.turma_id = t.id
  )
ON CONFLICT DO NOTHING;

-- FASE 4: Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_turmas_periodo ON turmas(periodo);
CREATE INDEX IF NOT EXISTS idx_turma_enrollments_aluno ON turma_enrollments(aluno_id);
CREATE INDEX IF NOT EXISTS idx_turma_enrollments_turma ON turma_enrollments(turma_id);