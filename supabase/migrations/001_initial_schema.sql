-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                  uuid references auth.users on delete cascade primary key,
  email               text not null,
  full_name           text,
  avatar_url          text,
  stripe_customer_id  text unique,
  subscription_status text not null default 'free'
    check (subscription_status in ('active','trialing','past_due','canceled','incomplete','free')),
  subscription_tier   text not null default 'free'
    check (subscription_tier in ('free','starter','pro','enterprise')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── saved_products ───────────────────────────────────────────────────────────
create table if not exists public.saved_products (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.profiles on delete cascade not null,
  product_id   text not null,
  product_data jsonb not null,
  notes        text,
  saved_at     timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.saved_products enable row level security;

create policy "Users can manage own saved products"
  on public.saved_products for all
  using (auth.uid() = user_id);

create index idx_saved_products_user_id on public.saved_products(user_id);
create index idx_saved_products_saved_at on public.saved_products(saved_at desc);

-- ─── scan_history ─────────────────────────────────────────────────────────────
create table if not exists public.scan_history (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles on delete cascade not null,
  query         text not null,
  results_count integer not null default 0,
  scanned_at    timestamptz not null default now()
);

alter table public.scan_history enable row level security;

create policy "Users can view own scan history"
  on public.scan_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own scan history"
  on public.scan_history for insert
  with check (auth.uid() = user_id);

create index idx_scan_history_user_id on public.scan_history(user_id);
create index idx_scan_history_scanned_at on public.scan_history(scanned_at desc);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
