-- Profile-level audits (wallet_credit) and pre-resolution declines have no virtual_cards row.
-- FK to virtual_cards still holds: NULL card_id does not reference a missing id (unlike 0).

ALTER TABLE public.audit_logs
  ALTER COLUMN card_id DROP NOT NULL;

COMMENT ON COLUMN public.audit_logs.card_id IS
  'Virtual card for card-scoped events; NULL when no card applies (e.g. wallet_credit, unknown PAN tap).';
