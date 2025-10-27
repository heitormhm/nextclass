-- Migration: Fix library_materials schema for proper student visibility
-- Rename class_id to turma_id and update foreign key to reference turmas table

-- Step 1: Drop existing foreign key constraint if it exists
ALTER TABLE library_materials
  DROP CONSTRAINT IF EXISTS library_materials_class_id_fkey;

-- Step 2: Rename class_id column to turma_id
ALTER TABLE library_materials
  RENAME COLUMN class_id TO turma_id;

-- Step 3: Add proper foreign key constraint referencing turmas
ALTER TABLE library_materials
  ADD CONSTRAINT library_materials_turma_id_fkey
  FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE;

-- Step 4: Add disciplina_id column if not exists (for filtering by subject)
ALTER TABLE library_materials
  ADD COLUMN IF NOT EXISTS disciplina_id UUID REFERENCES disciplinas(id) ON DELETE SET NULL;

-- Step 5: Add tags column if not exists (for categorization)
ALTER TABLE library_materials
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Step 6: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_library_materials_turma_id ON library_materials(turma_id);
CREATE INDEX IF NOT EXISTS idx_library_materials_disciplina_id ON library_materials(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_library_materials_tags ON library_materials USING GIN(tags);