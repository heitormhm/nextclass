-- 1. Criar enum para categorias acadêmicas
CREATE TYPE event_category AS ENUM (
  'sessao_estudo',
  'revisao_prova',
  'remarcacao_aula',
  'estagio',
  'atividade_avaliativa',
  'aula_online',
  'aula_presencial',
  'reuniao',
  'prazo',
  'outro'
);

-- 2. Criar enum para cores de eventos
CREATE TYPE event_color AS ENUM (
  'rosa', 'roxo', 'azul', 'verde', 'amarelo', 'laranja', 'vermelho', 'cinza'
);

-- 3. Adicionar colunas em personal_events
ALTER TABLE personal_events
ADD COLUMN category event_category DEFAULT 'outro',
ADD COLUMN color event_color DEFAULT 'azul',
ADD COLUMN notes TEXT,
ADD COLUMN notification_email BOOLEAN DEFAULT FALSE,
ADD COLUMN notification_platform BOOLEAN DEFAULT TRUE;

-- 4. Adicionar colunas em class_events
ALTER TABLE class_events
ADD COLUMN category event_category DEFAULT 'aula_presencial',
ADD COLUMN color event_color DEFAULT 'azul',
ADD COLUMN notes TEXT;

-- 5. Criar tabela de notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  event_id UUID,
  event_type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 6. RLS Policies para notificações
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 7. Índice para performance
CREATE INDEX idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC);