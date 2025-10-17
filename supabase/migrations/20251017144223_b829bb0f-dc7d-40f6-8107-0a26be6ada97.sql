-- Corrigir função validate_grade com SET search_path
CREATE OR REPLACE FUNCTION validate_grade()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.grade < 0 THEN
    RAISE EXCEPTION 'Grade must be greater than or equal to 0';
  END IF;
  IF NEW.grade > NEW.max_grade THEN
    RAISE EXCEPTION 'Grade cannot exceed max_grade';
  END IF;
  RETURN NEW;
END;
$$;

-- Corrigir função validate_quiz_source com SET search_path
CREATE OR REPLACE FUNCTION validate_quiz_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quiz_source NOT IN ('student_generated', 'teacher_official') THEN
    RAISE EXCEPTION 'quiz_source must be either student_generated or teacher_official';
  END IF;
  RETURN NEW;
END;
$$;