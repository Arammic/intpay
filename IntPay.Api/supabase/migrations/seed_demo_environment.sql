-- =============================================================================
-- IntPay demo seed (Supabase / PostgreSQL)
-- =============================================================================
-- Purpose: dense demo data that follows the API business rules:
--   * sender/recipient ownership for every card
--   * MCC allow-lists, city/country context, scheduled unlocks, invoice locks
--   * manual freeze, expired card, depleted card, open MCC card, self-funded cards
--   * audit_logs drive remaining_amount / uses_left / lock_money rollups
--
-- Run after these migrations:
--   * decision_status enum has approved, declined, info
--   * audit_logs.card_id is nullable for profile-level ledger events
-- =============================================================================

BEGIN;

TRUNCATE public.audit_logs, public.virtual_cards, public.intents, public.contacts, public.profiles
RESTART IDENTITY CASCADE;

-- 1. Profiles
INSERT INTO public.profiles (id, name, username, email, vault_balance, lock_money, created_at)
VALUES
  (1, 'Mhammed Fares', 'mhammed.fares', 'mhammed.fares@intpay.local', 8500.00, 0.00, NOW() - INTERVAL '90 days'),
  (2, 'Mery Kassis', 'mery.kassis', 'mery.kassis@intpay.local', 3200.00, 0.00, NOW() - INTERVAL '88 days'),
  (3, 'Reda Essa', 'reda.essa', 'reda.essa@intpay.local', 4600.00, 0.00, NOW() - INTERVAL '86 days'),
  (4, 'Abdalla Ahmed', 'abdalla.ahmed', 'abdalla.ahmed@intpay.local', 2800.00, 0.00, NOW() - INTERVAL '84 days'),
  (5, 'Arammic Business', 'arammic', 'arammic@intpay.local', 50000.00, 0.00, NOW() - INTERVAL '120 days'),
  (6, 'Laila Hassan', 'laila.hassan', 'laila.h@intpay.local', 1200.00, 0.00, NOW() - INTERVAL '60 days'),
  (7, 'Yaser Amer', 'yaser.amer', 'yaser.a@intpay.local', 950.00, 0.00, NOW() - INTERVAL '45 days');

-- 2. Contacts (matches Contact model: user_id, contact_id)
INSERT INTO public.contacts (user_id, contact_id)
VALUES
  (1,2), (1,3), (1,4), (1,5), (1,6), (1,7),
  (2,1), (2,3), (2,4),
  (3,1), (3,2), (3,4),
  (4,1), (4,2), (4,5),
  (5,1), (5,4), (5,6), (5,7),
  (6,1), (6,5), (6,7),
  (7,1), (7,5), (7,6);

-- 3. Intents (15 real-world scenarios)
INSERT INTO public.intents (
    id, creator_id, receiver_id, amount, remaining_amount,
    use_times, uses_left, expiry_at, country, city,
    description, status, created_at, category, mcc_codes, first_date_to_user, required_invoice_prove
)
VALUES
  (1, 1, 1, 1000.00, 1000.00, 10, 10, NOW()+INTERVAL '30 days', 'SA', 'Riyadh',
   'Cloud Services - self-funded infrastructure', 'active', NOW()-INTERVAL '20 days', 'Tech',
   '["4816","7372"]'::jsonb, NULL, true),

  (2, 2, 3, 200.00, 200.00, 5, 5, NOW()+INTERVAL '15 days', 'AE', 'Dubai',
   'Team Lunch - office collaboration', 'active', NOW()-INTERVAL '12 days', 'Food',
   '["5812","5814"]'::jsonb, NULL, false),

  (3, 1, 2, 1500.00, 1500.00, 5, 5, NOW()+INTERVAL '60 days', 'SA', 'Jeddah',
   'Birthday Gift - scheduled unlock', 'active', NOW()-INTERVAL '8 days', 'Shopping',
   '["5311","5944"]'::jsonb, NOW()+INTERVAL '5 days', false),

  (4, 3, 3, 100.00, 100.00, 2, 2, NOW()+INTERVAL '10 days', 'EG', 'Cairo',
   'Streaming subscriptions - depleted self card', 'active', NOW()-INTERVAL '9 days', 'Entertainment',
   '["4899","7832"]'::jsonb, NULL, false),

  (5, 2, 4, 300.00, 300.00, 3, 3, NOW()-INTERVAL '2 days', 'JO', 'Amman',
   'Old Trip - expired travel card', 'active', NOW()-INTERVAL '40 days', 'Travel',
   '["4112","4511"]'::jsonb, NULL, true),

  (6, 5, 1, 5000.00, 5000.00, 20, 20, NOW()+INTERVAL '45 days', 'US', 'New York',
   'Business Trip - mixed transport and hotel', 'active', NOW()-INTERVAL '5 days', 'Business',
   '["4111","4112","5812","7011"]'::jsonb, NULL, true),

  (7, 6, 6, 50.00, 50.00, 5, 5, NOW()+INTERVAL '7 days', 'YE', 'Sanaa',
   'Daily Coffee - low balance self card', 'active', NOW()-INTERVAL '7 days', 'Food',
   '["5814"]'::jsonb, NULL, false),

  (8, 1, 6, 400.00, 400.00, 10, 10, NOW()+INTERVAL '90 days', 'YE', 'Sanaa',
   'Study Materials - education support', 'active', NOW()-INTERVAL '4 days', 'Education',
   '["5942","8299"]'::jsonb, NULL, false),

  (9, 7, 7, 120.00, 120.00, 2, 2, NOW()+INTERVAL '5 days', 'SA', 'Dammam',
   'Quick Fix - open MCC emergency card', 'active', NOW()-INTERVAL '1 day', 'General',
   '[]'::jsonb, NULL, false),

  (10, 5, 4, 10000.00, 10000.00, 100, 100, NOW()+INTERVAL '1 year', 'ALL', 'ALL',
   'Global Ops - open merchant operations', 'active', NOW()-INTERVAL '3 days', 'Business',
   '[]'::jsonb, NULL, false),

  (11, 1, 3, 250.00, 250.00, 1, 1, NOW()+INTERVAL '40 days', 'AE', 'Abu Dhabi',
   'Future Concert - time-gated entertainment', 'active', NOW()-INTERVAL '2 days', 'Entertainment',
   '["7922"]'::jsonb, NOW()+INTERVAL '30 days', false),

  (12, 2, 2, 50.00, 50.00, 1, 1, NOW()+INTERVAL '2 days', 'AE', 'Dubai',
   'One-time tool - single use depleted', 'active', NOW()-INTERVAL '6 days', 'Tech',
   '["7372"]'::jsonb, NULL, false),

  (13, 5, 4, 20.00, 20.00, 1, 1, NOW()+INTERVAL '5 days', 'SA', 'Riyadh',
   'Small Test - insufficient balance decline', 'active', NOW()-INTERVAL '2 days', 'Tech',
   '["4816"]'::jsonb, NULL, false),

  (14, 4, 4, 2000.00, 2000.00, 10, 10, NOW()+INTERVAL '15 days', 'TR', 'Istanbul',
   'Vacation - self funded travel', 'active', NOW()-INTERVAL '11 days', 'Travel',
   '["7011","5812"]'::jsonb, NULL, false),

  (15, 6, 6, 100.00, 100.00, 5, 5, NOW()+INTERVAL '10 days', 'YE', 'Sanaa',
   'Savings - restricted test category', 'active', NOW()-INTERVAL '3 days', 'General',
   '["0000"]'::jsonb, NULL, false);

-- 4. Virtual cards (1:1 with intents)
INSERT INTO public.virtual_cards (
    id, stripe_card_id, intent_id, card_number, last4, cardholder_name,
    exp_month, exp_year, status, created_at, card_cvv,
    is_locked_by_pending_invoice, is_manually_frozen
)
VALUES
  (1, 'ic_mw_1', 1, '4111222233334444', '4444', 'Mhammed Fares', 12, 2027, 'active', NOW()-INTERVAL '20 days', '123', false, false),
  (2, 'ic_mw_2', 2, '4111555566667777', '7777', 'Reda Essa', 11, 2027, 'active', NOW()-INTERVAL '12 days', '456', false, false),
  (3, 'ic_mw_3', 3, '4111888899990000', '0000', 'Mery Kassis', 10, 2028, 'LOCKED', NOW()-INTERVAL '8 days', '789', false, false),
  (4, 'ic_mw_4', 4, '4111111122223333', '3333', 'Reda Essa', 9, 2026, 'active', NOW()-INTERVAL '9 days', '321', false, false),
  (5, 'ic_mw_5', 5, '4111444455556666', '6666', 'Abdalla Ahmed', 8, 2025, 'inactive', NOW()-INTERVAL '40 days', '654', true, false),
  (6, 'ic_mw_6', 6, '4111777788889999', '9999', 'Mhammed Fares', 7, 2029, 'active', NOW()-INTERVAL '5 days', '987', false, false),
  (7, 'ic_mw_7', 7, '4111000011112222', '2222', 'Laila Hassan', 6, 2026, 'active', NOW()-INTERVAL '7 days', '159', false, false),
  (8, 'ic_mw_8', 8, '4111333344445555', '5555', 'Laila Hassan', 5, 2027, 'active', NOW()-INTERVAL '4 days', '258', false, false),
  (9, 'ic_mw_9', 9, '4111666677778888', '8888', 'Yaser Amer', 4, 2026, 'active', NOW()-INTERVAL '1 day', '357', false, false),
  (10, 'ic_mw_10', 10, '4111999900001111', '1111', 'Abdalla Ahmed', 3, 2030, 'active', NOW()-INTERVAL '3 days', '456', false, false),
  (11, 'ic_mw_11', 11, '4111222244446666', '6666', 'Reda Essa', 2, 2028, 'LOCKED', NOW()-INTERVAL '2 days', '123', false, false),
  (12, 'ic_mw_12', 12, '4111888800002222', '2222', 'Mery Kassis', 1, 2026, 'active', NOW()-INTERVAL '6 days', '741', false, false),
  (13, 'ic_mw_13', 13, '4111555511113333', '3333', 'Abdalla Ahmed', 12, 2025, 'active', NOW()-INTERVAL '2 days', '852', false, false),
  (14, 'ic_mw_14', 14, '4111000077774444', '4444', 'Abdalla Ahmed', 11, 2027, 'active', NOW()-INTERVAL '11 days', '963', false, false),
  (15, 'ic_mw_15', 15, '4111333322221111', '1111', 'Laila Hassan', 10, 2026, 'active', NOW()-INTERVAL '3 days', '147', false, true);

-- 5. Audit logs: lifecycle + transaction simulation
INSERT INTO public.audit_logs (
    card_id, transaction_amount, merchant_name, mcc, decision, reason,
    created_at, city, entity_id, action, occurred_at
)
VALUES
  -- Lifecycle paper trail
  (1, 0, NULL, NULL, 'info'::public.decision_status, 'Intent created and funds reserved.', NOW()-INTERVAL '20 days', 'Riyadh', 1, 'budget_intent_created', NOW()-INTERVAL '20 days'),
  (1, 0, NULL, NULL, 'info'::public.decision_status, 'Virtual card issued with MCC restrictions.', NOW()-INTERVAL '20 days' + INTERVAL '1 minute', 'Riyadh', 1, 'virtual_card_issued', NOW()-INTERVAL '20 days' + INTERVAL '1 minute'),
  (5, 0, NULL, NULL, 'declined'::public.decision_status, 'Invoice verification failed; card locked pending invoice.', NOW()-INTERVAL '1 day', 'Amman', 5, 'invoice_verification', NOW()-INTERVAL '1 day'),
  (15, 0, NULL, NULL, 'info'::public.decision_status, 'Manual freeze enabled by card owner.', NOW()-INTERVAL '2 days', 'Sanaa', 15, 'card_manual_freeze_set', NOW()-INTERVAL '2 days'),

  -- Transaction history
  (1, 100.00, 'AWS Cloud', '4816', 'approved'::public.decision_status, NULL, NOW()-INTERVAL '5 days', 'Riyadh', 1, 'authorization', NOW()-INTERVAL '5 days'),
  (1, 50.00, 'Digital Ocean', '7372', 'approved'::public.decision_status, NULL, NOW()-INTERVAL '2 days', 'Riyadh', 1, 'authorization', NOW()-INTERVAL '2 days'),
  (1, 15.00, 'GitHub', '7372', 'approved'::public.decision_status, NULL, NOW(), 'Riyadh', 1, 'authorization', NOW()),

  (2, 30.00, 'Hardees', '5814', 'declined'::public.decision_status, 'City mismatch: card is scoped to Dubai.', NOW()-INTERVAL '1 day', 'Sharjah', 2, 'authorization', NOW()-INTERVAL '1 day'),
  (2, 40.00, 'KFC Dubai', '5814', 'approved'::public.decision_status, NULL, NOW()-INTERVAL '12 hours', 'Dubai', 2, 'authorization', NOW()-INTERVAL '12 hours'),
  (2, 40.00, 'Carrefour', '5411', 'declined'::public.decision_status, 'Transaction declined: merchant category code [5411] is not allowed for this intent.', NOW(), 'Dubai', 2, 'authorization', NOW()),

  (3, 100.00, 'Pandora', '5944', 'declined'::public.decision_status, 'Transaction declined: card is locked until the scheduled unlock time.', NOW(), 'Jeddah', 3, 'authorization', NOW()),

  (4, 50.00, 'Netflix', '4899', 'approved'::public.decision_status, NULL, NOW()-INTERVAL '4 days', 'Cairo', 4, 'authorization', NOW()-INTERVAL '4 days'),
  (4, 50.00, 'Disney+', '4899', 'approved'::public.decision_status, NULL, NOW()-INTERVAL '3 days', 'Cairo', 4, 'authorization', NOW()-INTERVAL '3 days'),
  (4, 20.00, 'Spotify', '4899', 'declined'::public.decision_status, 'Transaction declined: usage limit exceeded.', NOW(), 'Cairo', 4, 'authorization', NOW()),

  (5, 150.00, 'Turkish Airlines', '4511', 'declined'::public.decision_status, 'Transaction declined: this card cannot be used until the required invoice is uploaded and verified.', NOW(), 'Amman', 5, 'authorization', NOW()),

  (6, 300.00, 'Hilton NY', '7011', 'approved'::public.decision_status, NULL, NOW()-INTERVAL '1 day', 'New York', 6, 'authorization', NOW()-INTERVAL '1 day'),
  (6, 500.00, 'Yellow Cab', '4111', 'approved'::public.decision_status, NULL, NOW()-INTERVAL '10 hours', 'New York', 6, 'authorization', NOW()-INTERVAL '10 hours'),
  (6, 1200.00, 'Apple Store', '5732', 'declined'::public.decision_status, 'Transaction declined: merchant category code [5732] is not allowed for this intent.', NOW(), 'New York', 6, 'authorization', NOW()),

  (7, 15.00, 'Mocha Coffee', '5814', 'approved'::public.decision_status, NULL, NOW()-INTERVAL '2 days', 'Sanaa', 7, 'authorization', NOW()-INTERVAL '2 days'),
  (7, 20.00, 'Bon Coffee', '5814', 'approved'::public.decision_status, NULL, NOW()-INTERVAL '1 day', 'Sanaa', 7, 'authorization', NOW()-INTERVAL '1 day'),
  (7, 10.00, 'Tea Corner', '5814', 'declined'::public.decision_status, 'Transaction declined: insufficient remaining balance.', NOW(), 'Sanaa', 7, 'authorization', NOW()),

  (8, 50.00, 'Book Store', '5942', 'approved'::public.decision_status, NULL, NOW(), 'Sanaa', 8, 'authorization', NOW()),

  (10, 5000.00, 'Google Ads', '7311', 'approved'::public.decision_status, NULL, NOW(), 'Global', 10, 'authorization', NOW()),

  (13, 25.00, 'Vercel', '4816', 'declined'::public.decision_status, 'Transaction declined: insufficient remaining balance.', NOW(), 'Riyadh', 13, 'authorization', NOW()),

  (14, 200.00, 'Hotel Istanbul', '7011', 'approved'::public.decision_status, NULL, NOW(), 'Istanbul', 14, 'authorization', NOW()),

  (15, 20.00, 'Local Store', '5411', 'declined'::public.decision_status, 'Transaction declined: this card has been frozen by the sender or recipient.', NOW(), 'Sanaa', 15, 'authorization', NOW());

-- 6. Apply approved transactions to intents.
UPDATE public.intents i
SET
    remaining_amount = GREATEST(i.amount - agg.total_spent, 0),
    uses_left = GREATEST(i.use_times - agg.total_uses, 0)
FROM (
    SELECT
        vc.intent_id,
        SUM(al.transaction_amount) AS total_spent,
        COUNT(*) AS total_uses
    FROM public.audit_logs al
    JOIN public.virtual_cards vc ON vc.id = al.card_id
    WHERE al.decision = 'approved'::public.decision_status
    GROUP BY vc.intent_id
) agg
WHERE i.id = agg.intent_id;

-- 7. Self-funded lock_money follows current active remaining_amount for creator = receiver.
UPDATE public.profiles p
SET lock_money = COALESCE((
    SELECT SUM(i.remaining_amount)
    FROM public.intents i
    JOIN public.virtual_cards vc ON vc.intent_id = i.id
    WHERE i.creator_id = i.receiver_id
      AND i.creator_id = p.id
      AND i.status = 'active'
      AND vc.status IN ('active', 'LOCKED')
), 0);

-- 8. Opening treasury audit after nullable card_id migration.
INSERT INTO public.audit_logs (
    card_id, transaction_amount, merchant_name, mcc, decision, reason,
    created_at, city, entity_id, action, occurred_at
)
VALUES
  (NULL, 0.00, NULL, NULL, 'info'::public.decision_status, 'Wallet credited for demo treasury (USD).',
   NOW()-INTERVAL '90 days', NULL, 1, 'wallet_credit', NOW()-INTERVAL '90 days');

-- 9. Align sequences.
SELECT setval(pg_get_serial_sequence('public.profiles', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.profiles));
SELECT setval(pg_get_serial_sequence('public.intents', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.intents));
SELECT setval(pg_get_serial_sequence('public.virtual_cards', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.virtual_cards));
SELECT setval(pg_get_serial_sequence('public.audit_logs', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.audit_logs));

COMMIT;

-- Quick checks:
-- SELECT id, name, vault_balance, lock_money FROM public.profiles ORDER BY id;
-- SELECT id, creator_id, receiver_id, amount, remaining_amount, uses_left, first_date_to_user, required_invoice_prove FROM public.intents ORDER BY id;
-- SELECT id, intent_id, status, is_locked_by_pending_invoice, is_manually_frozen FROM public.virtual_cards ORDER BY id;
-- SELECT id, card_id, transaction_amount, decision, action, reason, city FROM public.audit_logs ORDER BY created_at;
