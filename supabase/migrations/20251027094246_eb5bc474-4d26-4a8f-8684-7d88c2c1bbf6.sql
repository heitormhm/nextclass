-- Migration: Mark existing lectures with Mermaid diagrams for reprocessing
-- This will trigger frontend to call postProcessMaterialDidatico

COMMENT ON TABLE lectures IS 'Updated at 2025-01-27: Added trigger for reprocessing existing Mermaid diagrams';

-- Update lectures that contain problematic Unicode characters in diagrams
UPDATE lectures
SET updated_at = NOW()
WHERE structured_content->>'material_didatico' LIKE '%```mermaid%'
  AND (
    structured_content->>'material_didatico' LIKE '%→%' OR
    structured_content->>'material_didatico' LIKE '%Δ%' OR
    structured_content->>'material_didatico' LIKE '%Ω%' OR
    structured_content->>'material_didatico' LIKE '%∫%' OR
    structured_content->>'material_didatico' LIKE '%∑%'
  );

-- Log the migration
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM lectures
  WHERE structured_content->>'material_didatico' LIKE '%```mermaid%';
  
  RAISE NOTICE 'Migration completed: % lectures with Mermaid diagrams marked for reprocessing', affected_count;
END $$;