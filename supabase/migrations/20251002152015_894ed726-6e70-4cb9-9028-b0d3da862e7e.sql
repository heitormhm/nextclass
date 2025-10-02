-- Create lesson_plans table
CREATE TABLE public.lesson_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  topic TEXT NOT NULL,
  duration TEXT,
  notes TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'generating',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for lesson_plans
CREATE POLICY "Teachers can view their own lesson plans" 
ON public.lesson_plans 
FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own lesson plans" 
ON public.lesson_plans 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own lesson plans" 
ON public.lesson_plans 
FOR UPDATE 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own lesson plans" 
ON public.lesson_plans 
FOR DELETE 
USING (auth.uid() = teacher_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lesson_plans_updated_at
BEFORE UPDATE ON public.lesson_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for lesson_plans table
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_plans;