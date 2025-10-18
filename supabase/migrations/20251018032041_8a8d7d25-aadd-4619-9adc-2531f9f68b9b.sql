-- Adicionar coluna user_role em conversations para analytics e performance
ALTER TABLE conversations 
ADD COLUMN user_role TEXT CHECK (user_role IN ('student', 'teacher'));

-- Backfill baseado em user_roles
UPDATE conversations c
SET user_role = (
  SELECT ur.role::TEXT 
  FROM user_roles ur 
  WHERE ur.user_id = c.user_id 
  LIMIT 1
);

-- Tornar NOT NULL após backfill
ALTER TABLE conversations 
ALTER COLUMN user_role SET NOT NULL;

-- Criar índices para analytics
CREATE INDEX idx_conversations_user_role ON conversations(user_role);
CREATE INDEX idx_conversations_role_created ON conversations(user_role, created_at DESC);

-- Adicionar coluna user_role em jobs
ALTER TABLE jobs 
ADD COLUMN user_role TEXT CHECK (user_role IN ('student', 'teacher'));

-- Backfill baseado em user_roles
UPDATE jobs j
SET user_role = (
  SELECT ur.role::TEXT 
  FROM user_roles ur 
  WHERE ur.user_id = j.user_id 
  LIMIT 1
);

-- Tornar NOT NULL após backfill
ALTER TABLE jobs 
ALTER COLUMN user_role SET NOT NULL;

-- Criar índices para analytics e queries otimizadas
CREATE INDEX idx_jobs_user_role ON jobs(user_role);
CREATE INDEX idx_jobs_role_status ON jobs(user_role, status);