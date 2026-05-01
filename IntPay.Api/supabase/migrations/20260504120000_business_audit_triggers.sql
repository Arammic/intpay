-- Minimal business audit: additive columns on audit_logs + high-signal triggers
-- (intents, virtual_cards, profiles vault_balance). No JSON. Idempotent.

-- -----------------------------------------------------------------------------
-- 1) Additive columns (preserve all existing columns)
-- -----------------------------------------------------------------------------
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS user_id integer NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_type text NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS status text NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS before_balance numeric(18, 2) NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS after_balance numeric(18, 2) NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS before_status text NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS after_status text NULL;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS note text NULL;

COMMENT ON COLUMN public.audit_logs.user_id IS 'Primary user this event is attributed to (creator, profile owner, or receiver for card issuance).';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Business entity: profile | intent | virtual_card.';
COMMENT ON COLUMN public.audit_logs.status IS 'Simplified outcome: success | failed | info.';
COMMENT ON COLUMN public.audit_logs.note IS 'Short human-readable summary; duplicated into reason for API compatibility.';

-- -----------------------------------------------------------------------------
-- 2) CHECK constraints (named, idempotent)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_entity_type_chk'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_entity_type_chk
      CHECK (entity_type IS NULL OR entity_type IN ('profile', 'intent', 'virtual_card'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_status_chk'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_status_chk
      CHECK (status IS NULL OR status IN ('success', 'failed', 'info'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Helper: insert one business-facing audit row (fills legacy + new columns)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_business_audit_row(
  p_user_id integer,
  p_entity_type text,
  p_entity_id integer,
  p_action text,
  p_status text,
  p_transaction_amount numeric,
  p_before_balance numeric,
  p_after_balance numeric,
  p_before_status text,
  p_after_status text,
  p_note text,
  p_card_id integer,
  p_decision public.decision_status
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    card_id,
    transaction_amount,
    merchant_name,
    mcc,
    decision,
    reason,
    created_at,
    city,
    entity_id,
    action,
    occurred_at,
    user_id,
    entity_type,
    status,
    before_balance,
    after_balance,
    before_status,
    after_status,
    note
  ) VALUES (
    p_card_id,
    COALESCE(p_transaction_amount, 0),
    NULL,
    NULL,
    p_decision,
    p_note,
    now(),
    NULL,
    p_entity_id,
    p_action,
    now(),
    p_user_id,
    p_entity_type,
    p_status,
    p_before_balance,
    p_after_balance,
    p_before_status,
    p_after_status,
    p_note
  );
END;
$$;

COMMENT ON FUNCTION public.insert_business_audit_row IS
  'Writes a single high-signal audit_logs row. Uses decision=info for lifecycle/wallet to avoid mixing into approved spend rollups.';

-- -----------------------------------------------------------------------------
-- 4) intents: INSERT + UPDATE (metadata / status only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_intents_business_audit_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note text;
BEGIN
  IF coalesce(current_setting('intpay.skip_business_audit', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_note := format(
      'Intent created (principal %s, receiver %s).',
      NEW.amount,
      NEW.receiver_id
    );
    PERFORM public.insert_business_audit_row(
      NEW.creator_id,
      'intent',
      NEW.id,
      'intent_created',
      'success',
      0::numeric,
      NULL,
      NULL,
      NULL,
      NULL,
      v_note,
      NULL,
      'info'::public.decision_status
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (
      OLD.description IS DISTINCT FROM NEW.description
      OR OLD.city IS DISTINCT FROM NEW.city
      OR OLD.country IS DISTINCT FROM NEW.country
      OR OLD.category IS DISTINCT FROM NEW.category
      OR OLD.mcc_codes IS DISTINCT FROM NEW.mcc_codes
      OR OLD.required_invoice_prove IS DISTINCT FROM NEW.required_invoice_prove
    ) THEN
      PERFORM public.insert_business_audit_row(
        NEW.creator_id,
        'intent',
        NEW.id,
        'intent_updated',
        'success',
        0::numeric,
        NULL,
        NULL,
        NULL,
        NULL,
        'Intent metadata updated.',
        NULL,
        'info'::public.decision_status
      );
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.insert_business_audit_row(
        NEW.creator_id,
        'intent',
        NEW.id,
        'intent_status_changed',
        'success',
        0::numeric,
        NULL,
        NULL,
        OLD.status::text,
        NEW.status::text,
        format('Intent status changed: %s -> %s.', OLD.status, NEW.status),
        NULL,
        'info'::public.decision_status
      );
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_intents_business_audit_ins ON public.intents;
CREATE TRIGGER trg_intents_business_audit_ins
  AFTER INSERT ON public.intents
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_intents_business_audit_fn();

DROP TRIGGER IF EXISTS trg_intents_business_audit_upd ON public.intents;
CREATE TRIGGER trg_intents_business_audit_upd
  AFTER UPDATE ON public.intents
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_intents_business_audit_fn();

-- -----------------------------------------------------------------------------
-- 5) virtual_cards: INSERT + governance/status UPDATE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_virtual_cards_business_audit_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id integer;
  v_recv integer;
  v_creator integer;
  v_note text;
BEGIN
  IF coalesce(current_setting('intpay.skip_business_audit', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT i.receiver_id, i.creator_id INTO v_recv, v_creator
    FROM public.intents i
    WHERE i.id = NEW.intent_id;

    v_user_id := coalesce(v_recv, v_creator);

    PERFORM public.insert_business_audit_row(
      v_user_id,
      'virtual_card',
      NEW.id,
      'card_created',
      'success',
      0::numeric,
      NULL,
      NULL,
      NULL,
      NULL,
      format('Virtual card issued (intent %s, last4 %s).', NEW.intent_id, NEW.last4),
      NEW.id,
      'info'::public.decision_status
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (
      OLD.status IS DISTINCT FROM NEW.status
      OR OLD.is_locked_by_pending_invoice IS DISTINCT FROM NEW.is_locked_by_pending_invoice
      OR OLD.is_manually_frozen IS DISTINCT FROM NEW.is_manually_frozen
    ) THEN
      v_note := format(
        'Card governance changed: status %s -> %s; invoice_lock %s -> %s; manual_freeze %s -> %s.',
        OLD.status,
        NEW.status,
        OLD.is_locked_by_pending_invoice,
        NEW.is_locked_by_pending_invoice,
        OLD.is_manually_frozen,
        NEW.is_manually_frozen
      );

      SELECT i.receiver_id, i.creator_id INTO v_recv, v_creator
      FROM public.intents i
      WHERE i.id = NEW.intent_id;

      v_user_id := coalesce(v_recv, v_creator);

      PERFORM public.insert_business_audit_row(
        v_user_id,
        'virtual_card',
        NEW.id,
        'card_status_changed',
        'success',
        0::numeric,
        NULL,
        NULL,
        OLD.status::text,
        NEW.status::text,
        v_note,
        NEW.id,
        'info'::public.decision_status
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_virtual_cards_business_audit_ins ON public.virtual_cards;
CREATE TRIGGER trg_virtual_cards_business_audit_ins
  AFTER INSERT ON public.virtual_cards
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_virtual_cards_business_audit_fn();

DROP TRIGGER IF EXISTS trg_virtual_cards_business_audit_upd ON public.virtual_cards;
CREATE TRIGGER trg_virtual_cards_business_audit_upd
  AFTER UPDATE ON public.virtual_cards
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_virtual_cards_business_audit_fn();

-- -----------------------------------------------------------------------------
-- 6) profiles: vault_balance changes (single source of truth vs app inserts)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_profiles_vault_business_audit_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric;
  v_action text;
  v_note text;
BEGIN
  IF coalesce(current_setting('intpay.skip_business_audit', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.vault_balance IS NOT DISTINCT FROM NEW.vault_balance THEN
    RETURN NEW;
  END IF;

  v_delta := NEW.vault_balance - OLD.vault_balance;

  IF v_delta > 0 THEN
    v_action := 'balance_added';
  ELSIF v_delta < 0 THEN
    v_action := 'balance_deducted';
  ELSE
    RETURN NEW;
  END IF;

  v_note := format(
    'Vault balance changed from %s to %s (delta %s).',
    OLD.vault_balance,
    NEW.vault_balance,
    v_delta
  );

  PERFORM public.insert_business_audit_row(
    NEW.id,
    'profile',
    NEW.id,
    v_action,
    'success',
    abs(v_delta),
    OLD.vault_balance,
    NEW.vault_balance,
    NULL,
    NULL,
    v_note,
    NULL,
    'info'::public.decision_status
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_vault_business_audit ON public.profiles;
CREATE TRIGGER trg_profiles_vault_business_audit
  AFTER UPDATE OF vault_balance ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_profiles_vault_business_audit_fn();

-- -----------------------------------------------------------------------------
-- 7) Indexes for user-facing feeds
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at
  ON public.audit_logs (user_id, created_at DESC NULLS LAST)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created_at
  ON public.audit_logs (entity_type, entity_id, created_at DESC NULLS LAST)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 8) Sample rows (optional manual checks; triggers populate these automatically)
-- -----------------------------------------------------------------------------
-- Example shape after a vault credit (from trigger):
-- INSERT INTO public.audit_logs (
--   card_id, transaction_amount, decision, reason, created_at, entity_id, action, occurred_at,
--   user_id, entity_type, status, before_balance, after_balance, before_status, after_status, note
-- ) VALUES (
--   NULL, 100.00, 'info'::public.decision_status, 'Vault balance changed from 1000.00 to 1100.00 (delta 100.00).',
--   now(), 1, 'balance_added', now(),
--   1, 'profile', 'success', 1000.00, 1100.00, NULL, NULL,
--   'Vault balance changed from 1000.00 to 1100.00 (delta 100.00).'
-- );
--
-- Example intent_created (from trigger): entity_type intent, action intent_created, transaction_amount 0, decision info.
-- Example card_created (from trigger): entity_type virtual_card, action card_created, card_id set, decision info.
