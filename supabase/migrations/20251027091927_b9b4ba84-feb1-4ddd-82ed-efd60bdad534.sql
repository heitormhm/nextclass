-- Enable students to view materials from their enrolled turmas
CREATE POLICY "Students can view materials from enrolled turmas"
ON library_materials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM turma_enrollments
    WHERE turma_enrollments.turma_id = library_materials.turma_id
    AND turma_enrollments.aluno_id = auth.uid()
  )
);