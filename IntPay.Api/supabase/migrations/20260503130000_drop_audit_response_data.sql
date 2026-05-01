-- Audit logs now keep human-readable reason/action fields only.
-- Remove jsonb response_data to simplify API responses and avoid payload parsing issues.

ALTER TABLE public.audit_logs
  DROP COLUMN IF EXISTS response_data;
