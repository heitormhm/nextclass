-- FASE 1: Extensão do Schema de Banco de Dados

-- 1.1: Atualizar tabela jobs para incluir novos tipos
ALTER TABLE jobs 
DROP CONSTRAINT IF EXISTS jobs_job_type_check;

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

-- 1.2: Criar tabela student_insights para armazenar insights acadêmicos
CREATE TABLE IF NOT EXISTS student_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  topic TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_insights_user_id ON student_insights(user_id);
CREATE INDEX idx_student_insights_action_type ON student_insights(action_type);
CREATE INDEX idx_student_insights_created_at ON student_insights(created_at DESC);

-- RLS Policies para student_insights
ALTER TABLE student_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights"
ON student_insights FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can create insights"
ON student_insights FOR INSERT
TO service_role
WITH CHECK (true);

-- 1.3: Atualizar tabela quizzes se não tiver estrutura adequada
CREATE TABLE IF NOT EXISTS generated_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_quizzes_user_id ON generated_quizzes(user_id);
CREATE INDEX idx_generated_quizzes_conversation_id ON generated_quizzes(conversation_id);

ALTER TABLE generated_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated quizzes"
ON generated_quizzes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can create generated quizzes"
ON generated_quizzes FOR INSERT
TO service_role
WITH CHECK (true);

-- 1.4: Criar tabela flashcard_sets para flashcards gerados
CREATE TABLE IF NOT EXISTS generated_flashcard_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  cards JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_flashcard_sets_user_id ON generated_flashcard_sets(user_id);
CREATE INDEX idx_generated_flashcard_sets_conversation_id ON generated_flashcard_sets(conversation_id);

ALTER TABLE generated_flashcard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated flashcard sets"
ON generated_flashcard_sets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can create generated flashcard sets"
ON generated_flashcard_sets FOR INSERT
TO service_role
WITH CHECK (true);