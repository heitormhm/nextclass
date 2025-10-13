-- Create conversation_suggestions table to persist suggestions
CREATE TABLE IF NOT EXISTS public.conversation_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_index INT NOT NULL,
  suggestions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_suggestions_conversation 
ON public.conversation_suggestions(conversation_id);

-- Enable RLS
ALTER TABLE public.conversation_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view suggestions from their own conversations
CREATE POLICY "Users can view suggestions from their conversations"
ON public.conversation_suggestions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_suggestions.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Service role can insert suggestions
CREATE POLICY "Service role can insert suggestions"
ON public.conversation_suggestions
FOR INSERT
WITH CHECK (true);