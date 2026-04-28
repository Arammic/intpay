-- 1. إعداد الأنواع المخصصة
do $$
begin
  if not exists (select 1 from pg_type where typname = 'intent_status') then
    create type intent_status as enum ('pending', 'active', 'expired');
  end if;
  if not exists (select 1 from pg_type where typname = 'decision_status') then
    create type decision_status as enum ('approved', 'declined');
  end if;
end$$;

-- 2. جدول البروفايلات (Profiles)
create table if not exists profiles (
  id serial primary key, 
  name text not null,
  username text unique not null,
  email text unique not null,
  vault_balance numeric(12,2) not null default 0 check (vault_balance >= 0),
  lock_money numeric(12,2) not null default 0 check (lock_money >= 0),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- 3. جدول جهات الاتصال (Contacts)
create table if not exists contacts (
  user_id int references profiles(id) on delete cascade,
  contact_id int references profiles(id) on delete cascade,
  primary key (user_id, contact_id)
);

-- 4. جدول النيات (Intents) - "تم تحديثه لإضافة الفئات"
create table if not exists intents (
  id serial primary key,
  creator_id int not null references profiles(id) on delete cascade,
  receiver_id int not null references profiles(id) on delete cascade,
  
  -- المنطق المالي
  amount numeric(12,2) not null check (amount > 0),
  remaining_amount numeric(12,2) not null check (remaining_amount >= 0),
  use_times int not null default 1,
  uses_left int not null default 1,
  
  -- قيود ذكية (Smart Constraints)
  category text, -- الفئة المختارة (مثلاً: Food, Travel, Tech) لربطها بـ MCC Lists
  expiry_at timestamptz,
  country text,
  city text,
  
  -- قيود الويب والإثبات
  lock_for_websites boolean default false,
  only_websites jsonb default '[]'::jsonb, -- قائمة بيضاء بأسماء المواقع المسموحة
  required_prove boolean default false,
  
  description text,
  status intent_status not null default 'active',
  created_at timestamptz not null default now()
);

-- 5. جدول البطاقات الافتراضية (Virtual Cards)
create table if not exists virtual_cards (
  id serial primary key,
  stripe_card_id text unique not null,
  intent_id int not null unique references intents(id) on delete cascade,
  card_number text,
  last4 text,
  cardholder_name text,
  exp_month int,
  exp_year int,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- 6. سجل العمليات (Audit Logs) - "شامل لكل تفاصيل الـ Webhook"
create table if not exists audit_logs (
  id serial primary key,
  card_id int not null references virtual_cards(id) on delete cascade,
  transaction_amount numeric(12,2) not null check (transaction_amount >= 0),
  merchant_name text,
  mcc text, -- الكود القادم من Stripe للمطابقة مع الـ Category المختار
  city text,
  country text, -- أضيف لضمان دقة التوثيق الجغرافي
  decision decision_status not null,
  reason text, -- يوضح سبب الرفض (مثلاً: "MCC Mismatch for Food category")
  created_at timestamptz not null default now()
);