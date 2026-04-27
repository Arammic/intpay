create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'intent_status') then
    create type intent_status as enum ('pending', 'active', 'expired');
  end if;
  if not exists (select 1 from pg_type where typname = 'decision_status') then
    create type decision_status as enum ('approved', 'declined');
  end if;
end$$;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  vault_balance numeric(12,2) not null default 0 check (vault_balance >= 0),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists intents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  raw_text text not null,
  amount numeric(12,2) not null check (amount > 0),
  status intent_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists smart_rules (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null unique references intents(id) on delete cascade,
  category text not null,
  expiry_at timestamptz not null,
  location_data jsonb,
  max_amount numeric(12,2) check (max_amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists virtual_cards (
  id uuid primary key default gen_random_uuid(),
  stripe_card_id text unique not null,
  intent_id uuid not null unique references intents(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references virtual_cards(id) on delete cascade,
  transaction_amount numeric(12,2) not null check (transaction_amount >= 0),
  merchant_info jsonb not null default '{}'::jsonb,
  decision decision_status not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_virtual_cards_stripe_card_id on virtual_cards(stripe_card_id);
create index if not exists idx_smart_rules_intent_id on smart_rules(intent_id);
create index if not exists idx_audit_logs_card_created_desc on audit_logs(card_id, created_at desc);
create index if not exists idx_intents_creator_receiver_status on intents(creator_id, receiver_id, status);
