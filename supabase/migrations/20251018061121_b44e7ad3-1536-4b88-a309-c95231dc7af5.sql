-- FASE 1: Adicionar coluna teacher_id em turmas
ALTER TABLE turmas
ADD COLUMN teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX idx_turmas_teacher_id ON turmas(teacher_id);

-- FASE 2: Corrigir RLS Policies de class_events
-- Remover policies antigas que usam 'classes'
DROP POLICY IF EXISTS "Teachers can manage their class events" ON class_events;
DROP POLICY IF EXISTS "Students can view events from enrolled classes" ON class_events;

-- Criar nova policy para professores usando 'turmas'
CREATE POLICY "Teachers can manage events in their turmas"
ON class_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM turmas
    WHERE turmas.id = class_events.class_id
      AND turmas.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM turmas
    WHERE turmas.id = class_events.class_id
      AND turmas.teacher_id = auth.uid()
  )
);

-- Criar nova policy para alunos usando 'turma_enrollments'
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

-- FASE 3: Adicionar RLS Policies em Turmas
-- Habilitar RLS em turmas (se ainda não estiver)
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;

-- Policy para professores verem suas turmas
CREATE POLICY "Teachers can view their turmas"
ON turmas
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Policy para professores gerenciarem suas turmas
CREATE POLICY "Teachers can manage their turmas"
ON turmas
FOR ALL
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Manter policy existente para alunos (não sobrescrever)
DROP POLICY IF EXISTS "Students can view enrolled turmas" ON turmas;
CREATE POLICY "Students can view enrolled turmas"
ON turmas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM turma_enrollments
    WHERE turma_enrollments.turma_id = turmas.id
      AND turma_enrollments.aluno_id = auth.uid()
  )
);

-- FASE 4: Vincular turmas existentes ao professor através das disciplinas
UPDATE turmas t
SET teacher_id = (
  SELECT d.teacher_id
  FROM disciplinas d
  WHERE d.turma_id = t.id
  LIMIT 1
)
WHERE t.teacher_id IS NULL
  AND EXISTS (
    SELECT 1 FROM disciplinas d
    WHERE d.turma_id = t.id
  );

-- FASE 6: Trigger para vincular professor automaticamente
-- Função para vincular professor à turma ao criar disciplina
CREATE OR REPLACE FUNCTION auto_link_teacher_to_turma()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar turma com teacher_id se ainda não tiver
  UPDATE turmas
  SET teacher_id = NEW.teacher_id
  WHERE id = NEW.turma_id
    AND teacher_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger em disciplinas
DROP TRIGGER IF EXISTS trigger_auto_link_teacher ON disciplinas;
CREATE TRIGGER trigger_auto_link_teacher
  AFTER INSERT ON disciplinas
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_teacher_to_turma();