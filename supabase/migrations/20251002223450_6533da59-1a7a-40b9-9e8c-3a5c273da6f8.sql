-- Create lectures table to store recorded lectures
CREATE TABLE public.lectures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova Aula',
  raw_transcript TEXT NOT NULL,
  structured_content JSONB,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'published')),
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Teachers can view their own lectures"
ON public.lectures
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own lectures"
ON public.lectures
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own lectures"
ON public.lectures
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own lectures"
ON public.lectures
FOR DELETE
USING (auth.uid() = teacher_id);

-- Create trigger for updated_at
CREATE TRIGGER update_lectures_updated_at
BEFORE UPDATE ON public.lectures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();