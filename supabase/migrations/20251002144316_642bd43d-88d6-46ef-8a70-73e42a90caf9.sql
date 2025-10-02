-- Create classes/turmas table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  course TEXT NOT NULL,
  period TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create library_materials table
CREATE TABLE IF NOT EXISTS public.library_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class_insights table for AI-generated insights
CREATE TABLE IF NOT EXISTS public.class_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL, -- 'alert' or 'opportunity'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_label TEXT,
  action_route TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "Teachers can view their own classes"
  ON public.classes FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own classes"
  ON public.classes FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own classes"
  ON public.classes FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own classes"
  ON public.classes FOR DELETE
  USING (auth.uid() = teacher_id);

-- RLS Policies for library_materials
CREATE POLICY "Teachers can view their own materials"
  ON public.library_materials FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own materials"
  ON public.library_materials FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own materials"
  ON public.library_materials FOR DELETE
  USING (auth.uid() = teacher_id);

-- RLS Policies for class_insights
CREATE POLICY "Teachers can view insights for their classes"
  ON public.class_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_insights.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();