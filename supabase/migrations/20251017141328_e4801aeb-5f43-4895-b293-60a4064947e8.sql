-- Adicionar coluna CPF na tabela users
ALTER TABLE users ADD COLUMN cpf TEXT;

-- Adicionar coluna para preferências de notificação por email
ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT true;

-- Comentários para documentação
COMMENT ON COLUMN users.cpf IS 'CPF do estudante (formato: 000.000.000-00)';
COMMENT ON COLUMN users.email_notifications IS 'Preferência de recebimento de notificações por email';