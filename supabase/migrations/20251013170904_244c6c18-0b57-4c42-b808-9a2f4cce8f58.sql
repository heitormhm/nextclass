-- Adicionar coluna conversation_id à tabela jobs (NULLABLE primeiro)
ALTER TABLE public.jobs 
ADD COLUMN conversation_id UUID;

-- Criar índice para melhor performance nas queries
CREATE INDEX idx_jobs_conversation_id ON public.jobs(conversation_id);

-- Popular dados existentes (extrair de input_payload) apenas onde a conversation existe
UPDATE public.jobs
SET conversation_id = (input_payload->>'conversationId')::uuid
WHERE input_payload->>'conversationId' IS NOT NULL
  AND conversation_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = (jobs.input_payload->>'conversationId')::uuid
  );

-- Adicionar foreign key constraint (permitindo NULL para jobs órfãos)
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES public.conversations(id) 
ON DELETE CASCADE;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.jobs.conversation_id IS 'Conversation to which this job belongs (nullable for orphaned jobs)';