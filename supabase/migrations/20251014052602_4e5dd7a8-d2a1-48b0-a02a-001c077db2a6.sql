-- Adicionar coluna metadata à tabela messages para armazenar informações de relatórios
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Criar índice GIN para queries rápidas em metadata
CREATE INDEX IF NOT EXISTS idx_messages_metadata 
ON messages USING GIN (metadata);

-- Comentário: Esta coluna permitirá identificar mensagens de relatório sem depender do tamanho do conteúdo