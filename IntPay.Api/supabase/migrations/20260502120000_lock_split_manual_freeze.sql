-- Split virtual card holds: invoice governance vs manual freeze (operator / sender / recipient).
-- Safe to re-run: uses IF EXISTS / IF NOT EXISTS patterns.
-- Historical rows: legacy is_locked=true is treated as is_locked_by_pending_invoice=true (see comment below).

-- 1) Manual freeze column (new semantics for POST .../lock-state)
ALTER TABLE public.virtual_cards
  ADD COLUMN IF NOT EXISTS is_manually_frozen boolean NOT NULL DEFAULT false;

-- 2) Rename legacy is_locked -> is_locked_by_pending_invoice when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'virtual_cards' AND column_name = 'is_locked'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'virtual_cards' AND column_name = 'is_locked_by_pending_invoice'
  ) THEN
    ALTER TABLE public.virtual_cards RENAME COLUMN is_locked TO is_locked_by_pending_invoice;
  END IF;
END $$;

-- 3) Ensure invoice-pending column exists (e.g. empty DB without prior migration)
ALTER TABLE public.virtual_cards
  ADD COLUMN IF NOT EXISTS is_locked_by_pending_invoice boolean NOT NULL DEFAULT false;

-- 4) One-time assumption: all pre-split locks attributed to invoice workflow (manual locks indistinguishable in DB)
COMMENT ON COLUMN public.virtual_cards.is_locked_by_pending_invoice IS
  'When true, spend is blocked until required invoice is uploaded and passes LLM verification.';
COMMENT ON COLUMN public.virtual_cards.is_manually_frozen IS
  'When true, spend is blocked by explicit sender/recipient freeze (POST lock-state).';

-- 5) Rebuild rich_intent_cards to expose both flags (replaces view from 20260501000000_invoice_verification.sql)
CREATE OR REPLACE VIEW public.rich_intent_cards AS
SELECT
  i.id AS intent_id,
  i.creator_id,
  i.receiver_id,
  i.amount,
  i.remaining_amount,
  i.status,
  i.mcc_codes,
  i.first_date_to_user,
  i.created_at,
  i.city,
  i.country,
  i.use_times,
  i.uses_left,
  i.description,
  i.required_invoice_prove,
  vc.id AS card_id,
  vc.card_number,
  vc.last4,
  vc.card_cvv,
  vc.cardholder_name,
  vc.exp_month,
  vc.exp_year,
  vc.stripe_card_id,
  COALESCE(creator.name, '') AS sender_name,
  COALESCE(vc.is_locked_by_pending_invoice, false) AS is_locked_by_pending_invoice,
  COALESCE(vc.is_manually_frozen, false) AS is_manually_frozen
FROM public.intents i
JOIN public.virtual_cards vc ON vc.intent_id = i.id
LEFT JOIN public.profiles creator ON creator.id = i.creator_id;
