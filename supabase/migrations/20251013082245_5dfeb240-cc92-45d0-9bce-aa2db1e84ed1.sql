-- Remover constraint antigo
ALTER TABLE jobs 
DROP CONSTRAINT IF EXISTS jobs_job_type_check;

-- Adicionar novo constraint incluindo GENERATE_SUGGESTIONS
ALTER TABLE jobs
ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type IN (
  'DEEP_SEARCH', 
  'LESSON_PLAN_GENERATION', 
  'GENERATE_SUGGESTIONS',
  'GENERATE_QUIZ', 
  'GENERATE_FLASHCARDS', 
  'LOG_ACADEMIC_INSIGHT'
));