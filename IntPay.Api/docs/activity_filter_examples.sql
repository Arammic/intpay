-- =============================================================================
-- Example SQL filters for activity / audit_logs (Postgres)
-- Aligns with: audit_logs columns + derived buckets (entity_type, outcome)
-- =============================================================================

-- Outcome mapping used in examples:
--   success  := decision = 'approved' OR (status IS NOT NULL AND status = 'success')
--   failed   := decision = 'declined' OR (status = 'failed')
--   info     := decision = 'info' AND (status IS NULL OR status = 'info')

-- -----------------------------------------------------------------------------
-- 1) Filter by user_id (profile-scoped rows use audit_logs.user_id)
-- -----------------------------------------------------------------------------
SELECT id, user_id, action, decision, status, entity_type, transaction_amount, created_at
FROM public.audit_logs
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 2) Filter by action (exact match)
-- -----------------------------------------------------------------------------
SELECT id, card_id, user_id, action, decision, transaction_amount, created_at
FROM public.audit_logs
WHERE action = 'authorization'
ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 3) Filter by normalized status = success
-- -----------------------------------------------------------------------------
SELECT id, action, decision, status, transaction_amount, created_at
FROM public.audit_logs
WHERE decision = 'approved'
   OR (status IS NOT NULL AND status = 'success')
ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 4) Filter by normalized status = failed
-- -----------------------------------------------------------------------------
SELECT id, action, decision, status, reason, created_at
FROM public.audit_logs
WHERE decision = 'declined'
   OR status = 'failed'
ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 5) Filter by entity_type = profile (stored column when set)
-- -----------------------------------------------------------------------------
SELECT id, user_id, action, before_balance, after_balance, note, created_at
FROM public.audit_logs
WHERE entity_type = 'profile'
ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 6) Filter by entity_type = virtual_card (stored OR inferred via card_id)
-- -----------------------------------------------------------------------------
SELECT id, card_id, entity_type, action, decision, created_at
FROM public.audit_logs
WHERE entity_type = 'virtual_card'
   OR (entity_type IS NULL AND card_id IS NOT NULL AND action <> 'authorization')
ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 7) Filter by entity_type = transaction (card-backed authorizations)
-- -----------------------------------------------------------------------------
SELECT id, card_id, merchant_name, mcc, decision, transaction_amount, created_at
FROM public.audit_logs
WHERE action = 'authorization'
ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 8) Date range on created_at (UTC)
-- -----------------------------------------------------------------------------
SELECT id, action, decision, created_at
FROM public.audit_logs
WHERE created_at >= (NOW() AT TIME ZONE 'utc') - INTERVAL '14 days'
  AND created_at <= (NOW() AT TIME ZONE 'utc')
ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 9) Combined filters: user 1, success payments only, last 30 days
-- -----------------------------------------------------------------------------
SELECT al.id, al.card_id, al.merchant_name, al.transaction_amount, al.created_at
FROM public.audit_logs al
WHERE al.user_id = 1
  AND al.action = 'authorization'
  AND al.decision = 'approved'
  AND al.created_at >= (NOW() AT TIME ZONE 'utc') - INTERVAL '30 days'
ORDER BY al.created_at DESC;

-- -----------------------------------------------------------------------------
-- 10) Join cards to restrict by participant user (creator or receiver)
-- -----------------------------------------------------------------------------
SELECT al.id, al.action, al.decision, vc.intent_id, i.creator_id, i.receiver_id, al.created_at
FROM public.audit_logs al
JOIN public.virtual_cards vc ON vc.id = al.card_id
JOIN public.intents i ON i.id = vc.intent_id
WHERE (i.creator_id = 1 OR i.receiver_id = 1)
  AND al.action = 'authorization'
ORDER BY al.created_at DESC
LIMIT 100;
