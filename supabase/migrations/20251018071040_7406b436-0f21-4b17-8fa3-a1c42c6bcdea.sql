-- ============================================
-- SISTEMA DE AUTO-MATRÍCULA DE ALUNOS
-- ============================================

-- 1. Matricular alunos existentes nas turmas correspondentes ao seu período
INSERT INTO turma_enrollments (aluno_id, turma_id)
SELECT 
  u.id as aluno_id,
  t.id as turma_id
FROM users u
CROSS JOIN turmas t
WHERE 
  u.period IS NOT NULL 
  AND u.period::text = t.periodo
  AND u.course = t.curso
  AND NOT EXISTS (
    SELECT 1 FROM turma_enrollments te 
    WHERE te.aluno_id = u.id AND te.turma_id = t.id
  );

-- 2. Criar função de auto-matrícula
CREATE OR REPLACE FUNCTION auto_enroll_student_in_turma()
RETURNS TRIGGER AS $$
BEGIN
  -- Matricular automaticamente em turma correspondente ao período do aluno
  INSERT INTO turma_enrollments (aluno_id, turma_id)
  SELECT 
    NEW.id,
    t.id
  FROM turmas t
  WHERE 
    NEW.period IS NOT NULL
    AND NEW.period::text = t.periodo
    AND NEW.course = t.curso
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar trigger para auto-matrícula em INSERT
DROP TRIGGER IF EXISTS trigger_auto_enroll_student ON users;
CREATE TRIGGER trigger_auto_enroll_student
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_student_in_turma();

-- 4. Criar trigger para re-matrícula em UPDATE (caso o aluno mude de período)
DROP TRIGGER IF EXISTS trigger_auto_reenroll_student ON users;
CREATE TRIGGER trigger_auto_reenroll_student
  AFTER UPDATE OF period, course ON users
  FOR EACH ROW
  WHEN (OLD.period IS DISTINCT FROM NEW.period OR OLD.course IS DISTINCT FROM NEW.course)
  EXECUTE FUNCTION auto_enroll_student_in_turma();