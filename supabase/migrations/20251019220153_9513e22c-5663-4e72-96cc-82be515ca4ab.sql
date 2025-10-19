-- Add new columns to lectures table
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS disciplina_id uuid REFERENCES public.disciplinas(id);
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS lesson_plan_url text;

-- Create teacher_quizzes table
CREATE TABLE IF NOT EXISTS public.teacher_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid REFERENCES public.lectures(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  questions jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create teacher_flashcards table
CREATE TABLE IF NOT EXISTS public.teacher_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid REFERENCES public.lectures(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  cards jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teacher_quizzes
CREATE POLICY "Teachers can manage their own quizzes"
ON public.teacher_quizzes
FOR ALL
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view published quizzes"
ON public.teacher_quizzes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures l
    WHERE l.id = teacher_quizzes.lecture_id
    AND l.status = 'published'
    AND l.class_id IN (
      SELECT turma_id FROM public.turma_enrollments
      WHERE aluno_id = auth.uid()
    )
  )
);

-- RLS Policies for teacher_flashcards
CREATE POLICY "Teachers can manage their own flashcards"
ON public.teacher_flashcards
FOR ALL
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view published flashcards"
ON public.teacher_flashcards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures l
    WHERE l.id = teacher_flashcards.lecture_id
    AND l.status = 'published'
    AND l.class_id IN (
      SELECT turma_id FROM public.turma_enrollments
      WHERE aluno_id = auth.uid()
    )
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_quizzes_lecture ON public.teacher_quizzes(lecture_id);
CREATE INDEX IF NOT EXISTS idx_teacher_flashcards_lecture ON public.teacher_flashcards(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lectures_disciplina ON public.lectures(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_lectures_class ON public.lectures(class_id);