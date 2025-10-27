-- FASE 1: Matricular aluno Heitor na turma do 6º período
-- Isso garantirá que o aluno veja as aulas da sua turma

INSERT INTO turma_enrollments (aluno_id, turma_id)
VALUES (
  '22a56b5c-6901-4681-b2d4-5ad08c98510d', -- Heitor
  '826fcb11-d6b5-4ef1-80ae-42450b4b1c90'  -- Turma 6º período Engenharia
)
ON CONFLICT DO NOTHING;