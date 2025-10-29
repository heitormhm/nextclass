-- FASE 2: Limpeza de Registros Duplicados
-- Remover quizzes duplicados, mantendo apenas o mais recente para cada lecture_id
WITH ranked_quizzes AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY lecture_id ORDER BY created_at DESC) as rn
  FROM teacher_quizzes
)
DELETE FROM teacher_quizzes 
WHERE id IN (
  SELECT id FROM ranked_quizzes WHERE rn > 1
);

-- Remover flashcards duplicados, mantendo apenas o mais recente para cada lecture_id
WITH ranked_flashcards AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY lecture_id ORDER BY created_at DESC) as rn
  FROM teacher_flashcards
)
DELETE FROM teacher_flashcards 
WHERE id IN (
  SELECT id FROM ranked_flashcards WHERE rn > 1
);

-- FASE 3: Adicionar Unique Constraints para Prevenir Futuros Duplicados
-- Garantir que cada lecture_id tenha apenas 1 quiz
ALTER TABLE teacher_quizzes
ADD CONSTRAINT unique_quiz_per_lecture UNIQUE (lecture_id);

-- Garantir que cada lecture_id tenha apenas 1 flashcard set
ALTER TABLE teacher_flashcards
ADD CONSTRAINT unique_flashcards_per_lecture UNIQUE (lecture_id);