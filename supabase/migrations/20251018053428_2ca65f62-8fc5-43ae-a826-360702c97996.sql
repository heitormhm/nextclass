-- ========================================
-- FASE 1: CRIAR TABELA DE DISCIPLINAS
-- ========================================

-- Tabela para armazenar disciplinas que professores ministram
CREATE TABLE IF NOT EXISTS public.disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  carga_horaria INTEGER,
  ementa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, turma_id, nome)
);

-- Habilitar RLS
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

-- Policy: Professores podem criar suas próprias disciplinas
CREATE POLICY "Teachers can create their own subjects"
ON public.disciplinas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = teacher_id);

-- Policy: Professores podem ver suas próprias disciplinas
CREATE POLICY "Teachers can view their own subjects"
ON public.disciplinas
FOR SELECT
TO authenticated
USING (auth.uid() = teacher_id);

-- Policy: Professores podem atualizar suas próprias disciplinas
CREATE POLICY "Teachers can update their own subjects"
ON public.disciplinas
FOR UPDATE
TO authenticated
USING (auth.uid() = teacher_id);

-- Policy: Professores podem deletar suas próprias disciplinas
CREATE POLICY "Teachers can delete their own subjects"
ON public.disciplinas
FOR DELETE
TO authenticated
USING (auth.uid() = teacher_id);

-- Policy: Alunos podem ver disciplinas das turmas em que estão matriculados
CREATE POLICY "Students can view subjects from their enrolled classes"
ON public.disciplinas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM turma_enrollments te
    WHERE te.turma_id = disciplinas.turma_id
      AND te.aluno_id = auth.uid()
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_disciplinas_teacher ON disciplinas(teacher_id);
CREATE INDEX IF NOT EXISTS idx_disciplinas_turma ON disciplinas(turma_id);
CREATE INDEX IF NOT EXISTS idx_disciplinas_teacher_turma ON disciplinas(teacher_id, turma_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_disciplinas_updated_at
  BEFORE UPDATE ON disciplinas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FASE 2: ATUALIZAR TABELA CLASS_EVENTS
-- ========================================

-- Adicionar referência à disciplina nos eventos
ALTER TABLE public.class_events 
ADD COLUMN IF NOT EXISTS disciplina_id UUID REFERENCES disciplinas(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_class_events_disciplina ON class_events(disciplina_id);

-- Adicionar flags de notificação
ALTER TABLE public.class_events 
ADD COLUMN IF NOT EXISTS notify_platform BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT false;

-- ========================================
-- FASE 3: ATUALIZAR ENUM DE CATEGORIAS
-- ========================================

-- 1. Remover default temporariamente
ALTER TABLE class_events ALTER COLUMN category DROP DEFAULT;

-- 2. Criar novo enum com categorias atualizadas
CREATE TYPE event_category_new AS ENUM (
  'aula',
  'prova',
  'atividade_avaliativa',
  'trabalho_grupo',
  'estagio',
  'atividade_pesquisa',
  'seminario',
  'reuniao',
  'outro'
);

-- 3. Converter coluna para texto temporariamente
ALTER TABLE class_events 
ALTER COLUMN category TYPE text USING category::text;

-- 4. Atualizar valores antigos para novos
UPDATE class_events
SET category = CASE 
  WHEN category = 'aula_presencial' THEN 'aula'
  WHEN category = 'aula_online' THEN 'aula'
  WHEN category = 'prova' THEN 'prova'
  WHEN category = 'seminario' THEN 'seminario'
  WHEN category = 'prazo' THEN 'outro'
  WHEN category = 'reuniao' THEN 'reuniao'
  ELSE 'outro'
END;

-- 5. Converter para o novo enum
ALTER TABLE class_events 
ALTER COLUMN category TYPE event_category_new USING category::event_category_new;

-- 6. Remover enum antigo
DROP TYPE IF EXISTS event_category CASCADE;

-- 7. Renomear novo enum
ALTER TYPE event_category_new RENAME TO event_category;

-- 8. Restaurar default
ALTER TABLE class_events 
ALTER COLUMN category SET DEFAULT 'aula'::event_category;