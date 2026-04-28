-- Ensure schema parity for existing environments.
alter table if exists intents
  add column if not exists category text;

alter table if exists audit_logs
  add column if not exists merchant_name text,
  add column if not exists mcc text,
  add column if not exists city text,
  add column if not exists reason text;

create or replace function create_intent_with_card_atomic(
  p_creator_id int,
  p_receiver_id int,
  p_amount numeric(12,2),
  p_use_times int,
  p_expiry_at timestamptz,
  p_country text,
  p_city text,
  p_lock_for_websites boolean,
  p_only_websites jsonb,
  p_required_prove boolean,
  p_description text,
  p_category text,
  p_stripe_card_id text,
  p_card_number text,
  p_last4 text,
  p_cardholder_name text,
  p_exp_month int,
  p_exp_year int
)
returns table(
  intent_id int,
  card_id int,
  stripe_card_id text,
  card_number text,
  last4 text,
  status text
)
language plpgsql
as $$
declare
  v_fee numeric(12,2) := 0.05;
  v_vault_balance numeric(12,2);
  v_lock_money numeric(12,2);
  v_intent_id int;
  v_card_id int;
begin
  if p_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;
  if p_use_times <= 0 then
    raise exception 'use_times must be greater than zero';
  end if;

  select vault_balance, lock_money
    into v_vault_balance, v_lock_money
  from profiles
  where id = p_creator_id
  for update;

  if not found then
    raise exception 'profile not found';
  end if;

  if v_vault_balance < (p_amount + v_fee) then
    raise exception 'insufficient vault balance';
  end if;

  update profiles
  set
    vault_balance = vault_balance - (p_amount + v_fee),
    lock_money = lock_money + p_amount
  where id = p_creator_id;

  insert into intents (
    creator_id,
    receiver_id,
    amount,
    remaining_amount,
    use_times,
    uses_left,
    category,
    expiry_at,
    country,
    city,
    lock_for_websites,
    only_websites,
    required_prove,
    description,
    status
  )
  values (
    p_creator_id,
    p_receiver_id,
    p_amount,
    p_amount,
    p_use_times,
    p_use_times,
    p_category,
    p_expiry_at,
    p_country,
    p_city,
    coalesce(p_lock_for_websites, false),
    coalesce(p_only_websites, '[]'::jsonb),
    coalesce(p_required_prove, false),
    p_description,
    'active'
  )
  returning id into v_intent_id;

  insert into virtual_cards (
    stripe_card_id,
    intent_id,
    card_number,
    last4,
    cardholder_name,
    exp_month,
    exp_year,
    status
  )
  values (
    p_stripe_card_id,
    v_intent_id,
    p_card_number,
    p_last4,
    p_cardholder_name,
    p_exp_month,
    p_exp_year,
    'active'
  )
  returning id into v_card_id;

  return query
  select
    v_intent_id,
    v_card_id,
    p_stripe_card_id,
    p_card_number,
    p_last4,
    'active'::text;
end;
$$;
