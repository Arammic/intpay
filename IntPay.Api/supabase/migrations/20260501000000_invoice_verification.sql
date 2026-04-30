-- Invoice verification workflow: virtual_cards lock + audit_logs metadata + rich_intent_cards view
-- Idempotent: safe to re-run.

-- 1) virtual_cards.is_locked
ALTER TABLE public.virtual_cards
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- 2) audit_logs: EntityId, Action, ResponseData (jsonb), OccurredAt (logical timestamp)
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_id integer NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS action text NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS response_data jsonb NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz NULL;

-- Backfill occurred_at from created_at where missing
UPDATE public.audit_logs
SET occurred_at = created_at
WHERE occurred_at IS NULL AND created_at IS NOT NULL;

-- Optional default for new rows (application still sets timestamps explicitly)
ALTER TABLE public.audit_logs
  ALTER COLUMN occurred_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_occurred
  ON public.audit_logs (entity_id, occurred_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_virtual_cards_intent_id
  ON public.virtual_cards (intent_id);

-- 3) rich_intent_cards: include is_locked from virtual_cards (replace view definition)
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
  COALESCE(vc.is_locked, false) AS is_locked
FROM public.intents i
JOIN public.virtual_cards vc ON vc.intent_id = i.id
LEFT JOIN public.profiles creator ON creator.id = i.creator_id;
