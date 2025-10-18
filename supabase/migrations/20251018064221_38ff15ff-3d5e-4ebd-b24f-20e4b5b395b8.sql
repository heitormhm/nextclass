-- FASE 1: Criar tabela teacher_turma_access e preparar turmas padrão
CREATE TABLE IF NOT EXISTS teacher_turma_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  turma_id uuid REFERENCES turmas(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  UNIQUE(teacher_id, turma_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_turma_access_teacher ON teacher_turma_access(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_turma_access_turma ON teacher_turma_access(turma_id);

ALTER TABLE teacher_turma_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their turma access"
ON teacher_turma_access
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Deletar turmas antigas que NÃO são do padrão (períodos 1-10 fixos)
DELETE FROM turmas 
WHERE faculdade = 'Centro Universitário Afya Montes Claros'
  AND curso = 'Engenharia';

-- Criar as 10 turmas padrão
INSERT INTO turmas (nome_turma, periodo, curso, faculdade, cidade, created_at, updated_at)
SELECT 
  'Engenharia - ' || periodo::text || 'º Período - Centro Universitário Afya Montes Claros' AS nome_turma,
  periodo::text,
  'Engenharia' AS curso,
  'Centro Universitário Afya Montes Claros' AS faculdade,
  'Montes Claros - MG' AS cidade,
  NOW() AS created_at,
  NOW() AS updated_at
FROM generate_series(1, 10) AS periodo;

-- FASE 2: Migrar alunos existentes para turmas corretas
-- Atualizar enrollment de Laurent (período 1)
UPDATE turma_enrollments te
SET turma_id = (
  SELECT t.id FROM turmas t
  WHERE t.periodo = '1'
    AND t.faculdade = 'Centro Universitário Afya Montes Claros'
    AND t.curso = 'Engenharia'
  LIMIT 1
)
WHERE te.aluno_id = '57f93b4c-766f-4f63-9516-10fbe7163cc9';

-- Atualizar enrollment de Heitor (período 6)
UPDATE turma_enrollments te
SET turma_id = (
  SELECT t.id FROM turmas t
  WHERE t.periodo = '6'
    AND t.faculdade = 'Centro Universitário Afya Montes Claros'
    AND t.curso = 'Engenharia'
  LIMIT 1
)
WHERE te.aluno_id = '6bd8e59a-ff40-4e17-ab90-5c68b2c4881b';

-- FASE 3: Vincular professor atual às 10 turmas
INSERT INTO teacher_turma_access (teacher_id, turma_id)
SELECT 
  '8c975486-59d3-4d53-8d3b-4a751474fac4'::uuid AS teacher_id,
  t.id AS turma_id
FROM turmas t
WHERE t.faculdade = 'Centro Universitário Afya Montes Claros'
  AND t.curso = 'Engenharia'
ON CONFLICT (teacher_id, turma_id) DO NOTHING;

-- FASE 4: Criar função e trigger para auto-vincular novos professores
CREATE OR REPLACE FUNCTION auto_link_new_teacher_to_turmas()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'teacher' THEN
    INSERT INTO teacher_turma_access (teacher_id, turma_id)
    SELECT 
      NEW.user_id,
      t.id
    FROM turmas t
    WHERE t.faculdade = 'Centro Universitário Afya Montes Claros'
      AND t.curso = 'Engenharia'
    ON CONFLICT (teacher_id, turma_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_link_new_teacher ON user_roles;
CREATE TRIGGER trigger_auto_link_new_teacher
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_new_teacher_to_turmas();

-- FASE 5: Atualizar RLS de class_events
DROP POLICY IF EXISTS "Teachers can manage events in their turmas" ON class_events;
DROP POLICY IF EXISTS "Teachers can manage events in accessible turmas" ON class_events;
DROP POLICY IF EXISTS "Teachers can manage events via access table" ON class_events;
DROP POLICY IF EXISTS "Students can view events from enrolled turmas" ON class_events;

-- Policy para professores gerenciarem eventos usando teacher_turma_access
CREATE POLICY "Teachers can manage events via access table"
ON class_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teacher_turma_access
    WHERE teacher_turma_access.turma_id = class_events.class_id
      AND teacher_turma_access.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teacher_turma_access
    WHERE teacher_turma_access.turma_id = class_events.class_id
      AND teacher_turma_access.teacher_id = auth.uid()
  )
);

-- Policy para alunos visualizarem eventos de suas turmas
CREATE POLICY "Students can view events from enrolled turmas"
ON class_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM turma_enrollments
    WHERE turma_enrollments.turma_id = class_events.class_id
      AND turma_enrollments.aluno_id = auth.uid()
  )
);

-- Garantir foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'class_events_class_id_fkey'
  ) THEN
    ALTER TABLE class_events
    ADD CONSTRAINT class_events_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES turmas(id)
    ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_class_events_class_id ON class_events(class_id);