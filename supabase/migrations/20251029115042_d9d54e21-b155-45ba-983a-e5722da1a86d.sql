-- PHASE 3: Clean JSON-wrapped content in lectures table
-- This is a one-time data fix to remove markdown code block wrappers from material_didatico_html

UPDATE lectures
SET structured_content = jsonb_set(
  structured_content,
  '{material_didatico_html}',
  to_jsonb(
    regexp_replace(
      regexp_replace(
        structured_content->>'material_didatico_html',
        '^```json\s*\n?', '', 'g'
      ),
      '\n?```\s*$', '', 'g'
    )
  )
)
WHERE id = '740cc4c4-492f-4f44-8330-8bedad63621b'
  AND (structured_content->>'material_didatico_html')::text ~ '^\s*```json';