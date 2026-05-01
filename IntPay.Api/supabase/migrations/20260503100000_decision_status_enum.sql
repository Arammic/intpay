-- decision_status enum: align with IntPay.Api audit_logs (tap + governance).
-- Idempotent: safe to re-run on Supabase (PostgreSQL 11+).
--
-- API values (C#): "approved" | "declined" | "info"
--   approved / declined — tap-to-pay simulation outcomes
--   info — governance & ledger (wallet_credit, intent_updated, card_manual_freeze_set, JIT narrative, etc.)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'decision_status'
  ) THEN
    CREATE TYPE public.decision_status AS ENUM ('approved', 'declined', 'info');
  END IF;
END $$;

-- Extend legacy enums that omitted governance / narrative values.
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'declined';
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'info';

COMMENT ON TYPE public.decision_status IS
  'Audit log decision: approved/declined (authorization), info (governance, funding, metadata).';
