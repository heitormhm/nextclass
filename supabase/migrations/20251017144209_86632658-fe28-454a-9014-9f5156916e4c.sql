-- Função para validar grade
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

-- Garantir que o trigger de validação existe
DROP TRIGGER IF EXISTS validate_grade_trigger ON grades;
CREATE TRIGGER validate_grade_trigger
BEFORE INSERT OR UPDATE ON grades
FOR EACH ROW
EXECUTE FUNCTION validate_grade();

-- Função para validar quiz_source
CREATE OR REPLACE FUNCTION validate_quiz_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quiz_source NOT IN ('student_generated', 'teacher_official') THEN
    RAISE EXCEPTION 'quiz_source must be either student_generated or teacher_official';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar quiz_source
DROP TRIGGER IF EXISTS validate_quiz_source_trigger ON quiz_attempts;
CREATE TRIGGER validate_quiz_source_trigger
BEFORE INSERT OR UPDATE ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION validate_quiz_source();

-- Comentários para documentação
COMMENT ON COLUMN quiz_attempts.quiz_source IS 'Origem do quiz: student_generated (gerado pelo aluno via IA no Chat) ou teacher_official (quiz oficial criado pelo professor)';
COMMENT ON COLUMN quiz_attempts.lecture_id IS 'ID da aula do professor (para quizzes oficiais). NULL para quizzes gerados pelo aluno no AI Chat';
COMMENT ON COLUMN flashcard_reviews.lecture_id IS 'ID da aula ou conjunto de flashcards (pode ser NULL para flashcards gerados no AI Chat)';