-- Refund request flag on virtual_cards (POST /api/v1/cards/{id}/request-refund).
-- Safe to re-run.

ALTER TABLE public.virtual_cards
  ADD COLUMN IF NOT EXISTS is_request_refund boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.virtual_cards.is_request_refund IS
  'When true, sender or recipient has requested a refund for this card/intent (ops follow-up).';

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
  COALESCE(vc.is_manually_frozen, false) AS is_manually_frozen,
  COALESCE(vc.is_request_refund, false) AS is_request_refund
FROM public.intents i
JOIN public.virtual_cards vc ON vc.intent_id = i.id
LEFT JOIN public.profiles creator ON creator.id = i.creator_id;
