-- Remove Mermaid-related columns from material_v2_jobs table
-- Mermaid.js has been completely removed from the system

-- Drop mermaid_diagrams_count column if it exists
ALTER TABLE material_v2_jobs 
DROP COLUMN IF EXISTS mermaid_diagrams_count;

-- Add callouts_count column for new visual system
ALTER TABLE material_v2_jobs 
ADD COLUMN IF NOT EXISTS callouts_count INTEGER DEFAULT 0;

COMMENT ON COLUMN material_v2_jobs.callouts_count IS 'Number of callout boxes in the generated material (replaces Mermaid diagrams)';