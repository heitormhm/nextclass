-- Add turma_id field to lectures table
ALTER TABLE public.lectures 
ADD COLUMN turma_id UUID REFERENCES public.turmas(id);

-- Make class_id nullable since we're transitioning to turma_id
ALTER TABLE public.lectures 
ALTER COLUMN class_id DROP NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_lectures_turma_id ON public.lectures(turma_id);