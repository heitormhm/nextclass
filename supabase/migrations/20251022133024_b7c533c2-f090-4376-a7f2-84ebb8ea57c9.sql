-- Migrate Evandro Júnior from student to teacher role
UPDATE user_roles
SET 
  role = 'teacher'::app_role,
  is_validated = true,
  validated_at = now(),
  updated_at = now()
WHERE user_id = 'ce63593c-d73c-451e-8be1-f7b259fe639e';

-- Also create teacher_turma_access for engineering turmas
INSERT INTO teacher_turma_access (teacher_id, turma_id)
SELECT 
  'ce63593c-d73c-451e-8be1-f7b259fe639e'::uuid,
  t.id
FROM turmas t
WHERE t.faculdade = 'Centro Universitário Afya Montes Claros'
  AND t.curso = 'Engenharia'
ON CONFLICT (teacher_id, turma_id) DO NOTHING;