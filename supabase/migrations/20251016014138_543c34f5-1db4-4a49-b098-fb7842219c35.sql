-- Create class_events table for class schedule
CREATE TABLE IF NOT EXISTS public.class_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('lecture', 'quiz', 'deadline', 'event')),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on class_events
ALTER TABLE public.class_events ENABLE ROW LEVEL SECURITY;

-- Students can view events from their enrolled classes
CREATE POLICY "Students can view events from enrolled classes"
  ON public.class_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.turma_enrollments te
      JOIN public.classes c ON c.id = class_events.class_id
      WHERE te.aluno_id = auth.uid()
    )
  );

-- Teachers can manage events for their classes
CREATE POLICY "Teachers can manage their class events"
  ON public.class_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_events.class_id
        AND classes.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_events.class_id
        AND classes.teacher_id = auth.uid()
    )
  );

-- Create personal_events table for user's personal calendar
CREATE TABLE IF NOT EXISTS public.personal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  event_type TEXT DEFAULT 'event',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on personal_events
ALTER TABLE public.personal_events ENABLE ROW LEVEL SECURITY;

-- Users can manage their own personal events
CREATE POLICY "Users can manage their own events"
  ON public.personal_events FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance on date queries
CREATE INDEX idx_class_events_date ON public.class_events(event_date);
CREATE INDEX idx_personal_events_date ON public.personal_events(event_date);