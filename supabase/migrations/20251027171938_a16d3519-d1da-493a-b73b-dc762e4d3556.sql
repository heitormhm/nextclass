-- Permitir que alunos leiam aulas publicadas das turmas em que estão matriculados
CREATE POLICY "Students can view published lectures from their turmas"
ON public.lectures
FOR SELECT
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1
    FROM public.turma_enrollments
    WHERE turma_enrollments.turma_id = lectures.turma_id
      AND turma_enrollments.aluno_id = auth.uid()
  )
);