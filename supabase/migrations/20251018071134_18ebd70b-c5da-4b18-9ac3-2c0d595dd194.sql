-- Corrigir security warning: Function Search Path Mutable
-- Adicionar search_path à função (usando CASCADE para dropar dependências)

DROP FUNCTION IF EXISTS auto_enroll_student_in_turma() CASCADE;

CREATE OR REPLACE FUNCTION auto_enroll_student_in_turma()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recriar triggers
CREATE TRIGGER trigger_auto_enroll_student
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_student_in_turma();

CREATE TRIGGER trigger_auto_reenroll_student
  AFTER UPDATE OF period, course ON users
  FOR EACH ROW
  WHEN (OLD.period IS DISTINCT FROM NEW.period OR OLD.course IS DISTINCT FROM NEW.course)
  EXECUTE FUNCTION auto_enroll_student_in_turma();