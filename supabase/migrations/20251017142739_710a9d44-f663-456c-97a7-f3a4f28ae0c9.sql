-- Criar tabela de notas/avaliações lançadas por professores
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  assessment_type TEXT NOT NULL,
  grade NUMERIC(4,2) NOT NULL,
  max_grade NUMERIC(4,2) NOT NULL DEFAULT 10.00,
  
  subject TEXT NOT NULL,
  description TEXT,
  assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar validação via trigger em vez de CHECK constraint
CREATE OR REPLACE FUNCTION validate_grade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.grade < 0 THEN
    RAISE EXCEPTION 'Grade must be greater than or equal to 0';
  END IF;
  IF NEW.grade > NEW.max_grade THEN
    RAISE EXCEPTION 'Grade cannot exceed max_grade';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_grade
BEFORE INSERT OR UPDATE ON grades
FOR EACH ROW
EXECUTE FUNCTION validate_grade();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_class ON grades(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_teacher ON grades(teacher_id);

-- RLS: Alunos veem suas próprias notas
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own grades"
ON grades FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- RLS: Professores podem gerenciar notas de suas turmas
CREATE POLICY "Teachers can manage grades for their classes"
ON grades FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = grades.class_id 
    AND classes.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = grades.class_id 
    AND classes.teacher_id = auth.uid()
  )
);

-- Criar tabela para matricular alunos em classes específicas
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(class_id, student_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);

-- RLS: Alunos veem suas próprias matrículas
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own enrollments"
ON class_enrollments FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- RLS: Professores veem matrículas de suas classes
CREATE POLICY "Teachers can view enrollments in their classes"
ON class_enrollments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = class_enrollments.class_id 
    AND classes.teacher_id = auth.uid()
  )
);

-- Adicionar campos para rastrear origem do quiz
ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS quiz_source TEXT DEFAULT 'student_generated',
ADD COLUMN IF NOT EXISTS lecture_id UUID REFERENCES lectures(id) ON DELETE SET NULL;

-- Criar validação para quiz_source
CREATE OR REPLACE FUNCTION validate_quiz_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quiz_source NOT IN ('student_generated', 'teacher_official') THEN
    RAISE EXCEPTION 'quiz_source must be either student_generated or teacher_official';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_quiz_source
BEFORE INSERT OR UPDATE ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION validate_quiz_source();

-- Índice para lecture_id em flashcard_reviews
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_lecture ON flashcard_reviews(lecture_id);

-- Comentários para documentação
COMMENT ON COLUMN quiz_attempts.quiz_source IS 'Origem: student_generated (gerado pelo aluno via IA) ou teacher_official (quiz oficial do professor)';
COMMENT ON COLUMN quiz_attempts.lecture_id IS 'ID da aula do professor (para quizzes oficiais)';
COMMENT ON TABLE grades IS 'Notas/avaliações lançadas por professores para seus alunos';
COMMENT ON TABLE class_enrollments IS 'Matrícula de alunos em classes/disciplinas específicas';