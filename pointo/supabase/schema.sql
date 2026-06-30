create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  referral_code text not null unique,
  referred_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.missions (
  id text primary key,
  title text not null,
  description text not null,
  points integer not null check (points > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mission_completions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null references public.missions(id),
  point_transaction_id uuid references public.point_transactions(id),
  completed_at timestamptz not null default now(),
  primary key (profile_id, mission_id)
);

create index if not exists point_transactions_profile_id_created_at_idx
  on public.point_transactions(profile_id, created_at desc);

create unique index if not exists point_transactions_one_signup_bonus_per_profile_idx
  on public.point_transactions(profile_id)
  where reason = 'signup_bonus';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

insert into public.missions (id, title, description, points, active, sort_order)
values
  (
    'install',
    'Install through a referral link',
    'Get 300 points for installing Pointo from a trusted referral.',
    300,
    true,
    10
  ),
  (
    'walk',
    'Walk and earn',
    'Complete a 10,000-step challenge and unlock 500 points.',
    500,
    true,
    20
  ),
  (
    'invite',
    'Invite a friend in Japan',
    'Share your referral code and earn another 250 points.',
    250,
    true,
    30
  )
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  points = excluded.points,
  active = excluded.active,
  sort_order = excluded.sort_order;

create or replace function public.claim_mission(
  p_profile_id uuid,
  p_mission_id text
)
returns table (
  points_balance integer,
  mission_id text,
  mission_title text,
  mission_description text,
  mission_points integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_mission public.missions%rowtype;
  created_transaction_id uuid;
begin
  select *
  into selected_mission
  from public.missions
  where id = p_mission_id
    and active = true;

  if not found then
    raise exception 'Mission is not active or does not exist.';
  end if;

  if exists (
    select 1
    from public.mission_completions
    where profile_id = p_profile_id
      and mission_id = p_mission_id
  ) then
    raise exception 'Mission has already been claimed.';
  end if;

  insert into public.mission_completions (profile_id, mission_id)
  values (p_profile_id, p_mission_id);

  insert into public.point_transactions (profile_id, amount, reason, metadata)
  values (
    p_profile_id,
    selected_mission.points,
    'mission_reward',
    jsonb_build_object('mission_id', p_mission_id)
  )
  returning id into created_transaction_id;

  update public.mission_completions
  set point_transaction_id = created_transaction_id
  where profile_id = p_profile_id
    and mission_id = p_mission_id;

  return query
  select
    coalesce(sum(pt.amount), 0)::integer as points_balance,
    selected_mission.id as mission_id,
    selected_mission.title as mission_title,
    selected_mission.description as mission_description,
    selected_mission.points as mission_points
  from public.point_transactions pt
  where pt.profile_id = p_profile_id;
end;
$$;
