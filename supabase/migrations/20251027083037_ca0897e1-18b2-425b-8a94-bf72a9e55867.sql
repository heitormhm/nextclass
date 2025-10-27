-- Create lecture_views table for tracking student views
CREATE TABLE public.lecture_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lecture_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_lecture_views_lecture_id ON public.lecture_views(lecture_id);
CREATE INDEX idx_lecture_views_user_id ON public.lecture_views(user_id);

-- Enable RLS
ALTER TABLE public.lecture_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can insert views"
  ON public.lecture_views
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own views"
  ON public.lecture_views
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view lecture views"
  ON public.lecture_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lectures
      WHERE lectures.id = lecture_views.lecture_id
      AND lectures.teacher_id = auth.uid()
    )
  );