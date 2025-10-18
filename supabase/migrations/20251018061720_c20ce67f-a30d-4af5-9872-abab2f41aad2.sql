-- Deletar eventos órfãos (eventos sem turma válida)
DELETE FROM class_events
WHERE class_id NOT IN (SELECT id FROM turmas);

-- Log para auditoria
DO $$
DECLARE
  deleted_count integer;
BEGIN
  -- Contar eventos órfãos antes da limpeza
  SELECT COUNT(*) INTO deleted_count
  FROM class_events
  WHERE class_id NOT IN (SELECT id FROM turmas);
  
  RAISE NOTICE 'Eventos órfãos identificados e deletados: %', deleted_count;
END $$;