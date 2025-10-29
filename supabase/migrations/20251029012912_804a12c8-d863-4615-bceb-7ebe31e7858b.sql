-- Marcar jobs obsoletos com tipo GENERATE_MATERIAL como FAILED
UPDATE teacher_jobs 
SET 
  status = 'FAILED',
  error_message = 'Job type obsoleto. Use GENERATE_LECTURE_DEEP_SEARCH',
  updated_at = NOW()
WHERE job_type = 'GENERATE_MATERIAL' 
AND status = 'PROCESSING';

-- Limpar jobs órfãos de mais de 24h em PROCESSING
UPDATE teacher_jobs 
SET 
  status = 'FAILED',
  error_message = 'Job timeout: processamento excedeu 24 horas',
  updated_at = NOW()
WHERE status = 'PROCESSING' 
AND created_at < NOW() - INTERVAL '24 hours';