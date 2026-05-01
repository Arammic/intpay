-- Virtual card lifecycle: only active | inactive on virtual_cards.status.
-- rich_intent_cards.status = vc.status (virtual card only; intent status removed from view).
-- Safe to re-run.

-- 1) Normalize legacy values before CHECK
UPDATE public.virtual_cards
SET status = 'active'
WHERE status IS NULL OR trim(status) = '';

UPDATE public.virtual_cards
SET status = lower(trim(status))
WHERE status IS NOT NULL;

UPDATE public.virtual_cards
SET status = 'active'
WHERE status IN ('locked');

UPDATE public.virtual_cards
SET status = 'active'
WHERE status IS NOT NULL AND status NOT IN ('active', 'inactive');

-- 2) CHECK constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'virtual_cards_status_chk'
      AND conrelid = 'public.virtual_cards'::regclass
  ) THEN
    ALTER TABLE public.virtual_cards
      ADD CONSTRAINT virtual_cards_status_chk
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

COMMENT ON COLUMN public.virtual_cards.status IS
  'Virtual card lifecycle: active or inactive only.';

-- 3) View: status column is virtual_cards.status only.
-- DROP required: Postgres forbids CREATE OR REPLACE when column "status" type changes
-- (was intents.status enum intent_status; now text from virtual_cards.status).
DROP VIEW IF EXISTS public.rich_intent_cards CASCADE;

CREATE VIEW public.rich_intent_cards AS
SELECT
  i.id AS intent_id,
  i.creator_id,
  i.receiver_id,
  i.amount,
  i.remaining_amount,
  vc.status AS status,
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
  COALESCE(vc.is_manually_frozen, false) AS is_manually_frozen,
  COALESCE(vc.is_request_refund, false) AS is_request_refund
FROM public.intents i
JOIN public.virtual_cards vc ON vc.intent_id = i.id
LEFT JOIN public.profiles creator ON creator.id = i.creator_id;
