-- Create turmas table for class management
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_turma TEXT NOT NULL UNIQUE,
  curso TEXT NOT NULL DEFAULT 'Engenharia',
  periodo TEXT NOT NULL,
  faculdade TEXT NOT NULL DEFAULT 'Unifip-Moc',
  cidade TEXT NOT NULL DEFAULT 'Montes Claros - MG',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create turma_enrollments table for student-class associations
CREATE TABLE IF NOT EXISTS public.turma_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aluno_id, turma_id)
);

-- Enable RLS on both tables
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies for turmas
CREATE POLICY "Teachers can view all turmas"
ON public.turmas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'teacher'
  )
);

CREATE POLICY "Students can view their own turmas"
ON public.turmas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.turma_enrollments
    WHERE turma_enrollments.turma_id = turmas.id 
    AND turma_enrollments.aluno_id = auth.uid()
  )
);

-- Policies for turma_enrollments
CREATE POLICY "Students can view their own enrollments"
ON public.turma_enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = aluno_id);

CREATE POLICY "Teachers can view all enrollments"
ON public.turma_enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'teacher'
  )
);

-- Create trigger for updated_at on turmas
CREATE TRIGGER update_turmas_updated_at
BEFORE UPDATE ON public.turmas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();