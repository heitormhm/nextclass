-- Corrigir foreign key: class_events.class_id deve referenciar turmas (não classes)
ALTER TABLE public.class_events 
DROP CONSTRAINT IF EXISTS class_events_class_id_fkey;

ALTER TABLE public.class_events
ADD CONSTRAINT class_events_class_id_fkey 
FOREIGN KEY (class_id) 
REFERENCES public.turmas(id) 
ON DELETE CASCADE;