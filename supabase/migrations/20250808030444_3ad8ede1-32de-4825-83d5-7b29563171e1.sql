-- Delete the oldest token row by created_at
WITH oldest AS (
  SELECT id
  FROM public.tokens
  ORDER BY created_at ASC
  LIMIT 1
)
DELETE FROM public.tokens t
USING oldest
WHERE t.id = oldest.id;