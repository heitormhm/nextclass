-- Create quiz_attempts table to track student quiz performance
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((score::DECIMAL / NULLIF(max_score, 0)) * 100, 2)) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flashcard_reviews table to track flashcard study sessions
CREATE TABLE public.flashcard_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((correct_count::DECIMAL / NULLIF(total_count, 0)) * 100, 2)) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can view their own quiz attempts"
  ON public.quiz_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz attempts"
  ON public.quiz_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for flashcard_reviews
CREATE POLICY "Users can view their own flashcard reviews"
  ON public.flashcard_reviews
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcard reviews"
  ON public.flashcard_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_quiz_attempts_user_created ON public.quiz_attempts(user_id, created_at DESC);
CREATE INDEX idx_flashcard_reviews_user_created ON public.flashcard_reviews(user_id, created_at DESC);