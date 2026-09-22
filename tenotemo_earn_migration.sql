-- TENOTEMO EARN PILOT. Run after tenotemo_normal_games_migration.sql and tenotemo_spotlight_migration.sql.
-- No automatic cash prize or payment. Existing historical award rows are preserved.
-- Pilot figures are proposals; referral counts are indicative and must be reviewed before rewards.
begin;
create table if not exists public.tenotemo_memory_wallet(
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance integer not null default 0 check(balance>=0),
 updated_at timestamptz not null default now());
create table if not exists public.tenotemo_memory_claims(
 user_id uuid not null references auth.users(id) on delete cascade,
 score_date date not null,
 completion_credits integer not null default 0,
 top50_credits integer not null default 0,
 claimed_at timestamptz not null default now(),
 primary key(user_id,score_date));
create table if not exists public.tenotemo_company_packages(
 user_id uuid primary key references auth.users(id) on delete cascade,
 package_key text not null check(package_key in ('starter','growth','premium')),
 expires_at timestamptz not null,
 granted_spotlight_credits integer not null check(granted_spotlight_credits>0),
 created_at timestamptz not null default now());
create table if not exists public.tenotemo_earn_campaigns(
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references auth.users(id),
 spotlight_post_id uuid not null unique references public.tenotemo_spotlight_posts(id),
 title text not null check(length(title) between 3 and 90),
 description text not null default '' check(length(description)<=350),
 credit_cost integer not null default 2 check(credit_cost between 0 and 50),
 reward_budget_cents integer not null default 0 check(reward_budget_cents>=0),
 awarded_cents integer not null default 0 check(awarded_cents>=0 and awarded_cents<=reward_budget_cents),
 status text not null default 'paused' check(status in ('paused','active','closed')),
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 created_at timestamptz not null default now());
create table if not exists public.tenotemo_earn_enrolments(
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.tenotemo_earn_campaigns(id),
 user_id uuid not null references auth.users(id),
 referral_code text not null unique default encode(gen_random_bytes(18),'hex'),
 joined_at timestamptz not null default now(),
 unique(campaign_id,user_id));
create table if not exists public.tenotemo_earn_visits(
 id bigint generated always as identity primary key,
 enrolment_id uuid not null references public.tenotemo_earn_enrolments(id),
 visitor_hash text not null,
 visit_day date not null default (now() at time zone 'Africa/Johannesburg')::date,
 created_at timestamptz not null default now(),
 unique(enrolment_id,visitor_hash,visit_day));
create table if not exists public.tenotemo_earn_rewards(
 id bigint generated always as identity primary key,
 enrolment_id uuid not null references public.tenotemo_earn_enrolments(id),
 amount_cents integer not null check(amount_cents>0),
 status text not null default 'approved' check(status in ('approved','paid')),
 reason text not null check(length(reason) between 8 and 250),
 created_at timestamptz not null default now(),
 paid_at timestamptz);
create index if not exists tenotemo_earn_campaign_status_idx on public.tenotemo_earn_campaigns(status,ends_at);
create index if not exists tenotemo_earn_visits_enrol_idx on public.tenotemo_earn_visits(enrolment_id);
-- No direct client writes to financial or referral tables. Only SECURITY DEFINER RPCs below.
alter table public.tenotemo_memory_wallet enable row level security;
alter table public.tenotemo_memory_claims enable row level security;
alter table public.tenotemo_company_packages enable row level security;
alter table public.tenotemo_earn_campaigns enable row level security;
alter table public.tenotemo_earn_enrolments enable row level security;
alter table public.tenotemo_earn_visits enable row level security;
alter table public.tenotemo_earn_rewards enable row level security;
revoke all on public.tenotemo_memory_wallet,public.tenotemo_memory_claims,public.tenotemo_company_packages,public.tenotemo_earn_campaigns,public.tenotemo_earn_enrolments,public.tenotemo_earn_visits,public.tenotemo_earn_rewards from public,anon,authenticated;
-- Ranking rewards: 1=50, 2=40, 3=30, 4-10=20, 11-20=10, 21-50=5.
create or replace function public.tenotemo_rank_memory_credits(p_position bigint)
returns integer language sql immutable set search_path='' as $$
 select case when p_position=1 then 50 when p_position=2 then 40 when p_position=3 then 30
 when p_position between 4 and 10 then 20 when p_position between 11 and 20 then 10
 when p_position between 21 and 50 then 5 else 0 end;
$$;
-- A previous day may be claimed only after it closes. Daily game points >0 is a pilot proxy
-- for completed game activity; stricter server-side completion events should replace it later.
create or replace function public.tenotemo_claim_memory_day(p_date date)
returns table(completion_credits integer,top50_credits integer,balance integer)
language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); d date:=(now() at time zone 'Africa/Johannesburg')::date;
 n integer; pos bigint; earned integer; ranked integer; current_balance integer;
begin
 if u is null then raise exception 'Sign in required'; end if;
 if p_date is null or p_date>=d or p_date<d-30 then raise exception 'Claim a completed day within the last 30 days'; end if;
 perform pg_advisory_xact_lock(hashtext('memory-'||u::text));
 select count(*)::integer into n from public.tenotemo_normal_daily_best b
 where b.user_id=u and b.score_date=p_date and b.best_points>0;
 if n=0 then raise exception 'No recorded normal-game activity for this day'; end if;
 with scores as (
 select b.user_id,sum(b.best_points)::bigint pts,max(b.updated_at) last_update
 from public.tenotemo_normal_daily_best b where b.score_date=p_date group by b.user_id
 ), ranks as (
 select s.user_id,row_number() over(order by s.pts desc,s.last_update asc,s.user_id) position from scores s where s.pts>0
 ) select r.position into pos from ranks r where r.user_id=u;
 earned:=n+case when n=5 then 2 else 0 end;
 ranked:=public.tenotemo_rank_memory_credits(pos);
 insert into public.tenotemo_memory_claims(user_id,score_date,completion_credits,top50_credits)
 values(u,p_date,earned,ranked) on conflict do nothing;
 if not found then raise exception 'Credits for this day were already claimed'; end if;
 insert into public.tenotemo_memory_wallet(user_id,balance) values(u,earned+ranked)
 on conflict(user_id) do update set balance=public.tenotemo_memory_wallet.balance+excluded.balance,updated_at=now()
 returning public.tenotemo_memory_wallet.balance into current_balance;
 return query select earned,ranked,current_balance;
end $$;
create or replace function public.tenotemo_earn_home()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); result jsonb;
begin
 if u is null then raise exception 'Sign in required'; end if;
 select jsonb_build_object(
 'memory_credits',coalesce((select balance from public.tenotemo_memory_wallet where user_id=u),0),
 'approved_cents',coalesce((select sum(r.amount_cents) from public.tenotemo_earn_rewards r join public.tenotemo_earn_enrolments e on e.id=r.enrolment_id where e.user_id=u and r.status='approved'),0),
 'paid_cents',coalesce((select sum(r.amount_cents) from public.tenotemo_earn_rewards r join public.tenotemo_earn_enrolments e on e.id=r.enrolment_id where e.user_id=u and r.status='paid'),0),
 'campaigns',coalesce((select jsonb_agg(x) from (
 select c.id,c.spotlight_post_id,c.title,c.description,c.credit_cost,c.reward_budget_cents,c.awarded_cents,c.ends_at,
 e.referral_code,(select count(*) from public.tenotemo_earn_visits v where v.enrolment_id=e.id) as indicative_visits,
 (select coalesce(sum(r.amount_cents),0) from public.tenotemo_earn_rewards r where r.enrolment_id=e.id and r.status='approved') as approved_cents
 from public.tenotemo_earn_campaigns c left join public.tenotemo_earn_enrolments e on e.campaign_id=c.id and e.user_id=u
 where (c.status='active' and c.starts_at<=now() and c.ends_at>now()) or e.id is not null
 order by c.created_at desc limit 50) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;
create or replace function public.tenotemo_earn_join(p_campaign_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); cost integer; code text;
begin
 if u is null then raise exception 'Sign in required'; end if;
 perform pg_advisory_xact_lock(hashtext('memory-'||u::text));
 select e.referral_code into code from public.tenotemo_earn_enrolments e where e.campaign_id=p_campaign_id and e.user_id=u;
 if code is not null then return code; end if;
 select c.credit_cost into cost from public.tenotemo_earn_campaigns c where c.id=p_campaign_id
 and c.status='active' and c.starts_at<=now() and c.ends_at>now();
 if not found then raise exception 'Campaign unavailable'; end if;
 update public.tenotemo_memory_wallet set balance=balance-cost,updated_at=now() where user_id=u and balance>=cost;
 if not found then raise exception 'Not enough Memory Credits'; end if;
 insert into public.tenotemo_earn_enrolments(campaign_id,user_id) values(p_campaign_id,u) returning referral_code into code;
 return code;
end $$;
create or replace function public.tenotemo_earn_campaign_for_post(p_post_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(
 select 1 from public.tenotemo_earn_campaigns c where c.spotlight_post_id=p_post_id
 and c.status='active' and c.starts_at<=now() and c.ends_at>now());
$$;
-- Admin grants company exposure after confirming cleared EFT. 1 credit = 100 purchased views.
create or replace function public.tenotemo_admin_company_package(p_company_id uuid,p_package text)
returns void language plpgsql security definer set search_path='' as $$
declare credits integer;
begin
 if not (select public.tenotemo_is_admin()) then raise exception 'Admin only'; end if;
 credits:=case p_package when 'starter' then 50 when 'growth' then 200 when 'premium' then 750 else null end;
 if credits is null then raise exception 'Unknown package'; end if;
 if not exists(select 1 from auth.users where id=p_company_id) then raise exception 'Company account missing'; end if;
 insert into public.tenotemo_spotlight_wallet(user_id,purchased_views) values(p_company_id,credits*100)
 on conflict(user_id) do update set purchased_views=public.tenotemo_spotlight_wallet.purchased_views+excluded.purchased_views,updated_at=now();
 insert into public.tenotemo_company_packages(user_id,package_key,expires_at,granted_spotlight_credits)
 values(p_company_id,p_package,now()+interval '1 month',credits)
 on conflict(user_id) do update set package_key=excluded.package_key,expires_at=excluded.expires_at,granted_spotlight_credits=excluded.granted_spotlight_credits;
end $$;
create or replace function public.tenotemo_admin_campaign(p_company_id uuid,p_post_id uuid,p_title text,p_description text,p_budget_cents integer,p_credit_cost integer,p_ends_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 if not (select public.tenotemo_is_admin()) then raise exception 'Admin only'; end if;
 if not exists(select 1 from public.tenotemo_company_packages where user_id=p_company_id and expires_at>now()) then raise exception 'Company package inactive'; end if;
 if not exists(select 1 from public.tenotemo_spotlight_posts where id=p_post_id and user_id=p_company_id and status='approved') then raise exception 'Post must belong to company and be approved'; end if;
 if length(trim(coalesce(p_title,''))) not between 3 and 90 or length(coalesce(p_description,''))>350
 or p_budget_cents<0 or p_credit_cost not between 0 and 50 or p_ends_at<=now() then raise exception 'Invalid campaign details'; end if;
 insert into public.tenotemo_earn_campaigns(company_id,spotlight_post_id,title,description,reward_budget_cents,credit_cost,ends_at,status)
 values(p_company_id,p_post_id,trim(p_title),coalesce(p_description,''),p_budget_cents,p_credit_cost,p_ends_at,'active') returning id into cid;
 return cid;
end $$;
-- Admin-only approved reward, limited to campaign's recorded budget. Manual bank payment remains separate.
create or replace function public.tenotemo_admin_reward(p_enrolment_id uuid,p_amount_cents integer,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 if not (select public.tenotemo_is_admin()) then raise exception 'Admin only'; end if;
 if p_amount_cents<=0 or length(trim(coalesce(p_reason,''))) not between 8 and 250 then raise exception 'Invalid reward'; end if;
 select campaign_id into cid from public.tenotemo_earn_enrolments where id=p_enrolment_id;
 if cid is null then raise exception 'Enrolment missing'; end if;
 update public.tenotemo_earn_campaigns set awarded_cents=awarded_cents+p_amount_cents
 where id=cid and awarded_cents+p_amount_cents<=reward_budget_cents;
 if not found then raise exception 'Campaign reward budget exhausted'; end if;
 insert into public.tenotemo_earn_rewards(enrolment_id,amount_cents,reason) values(p_enrolment_id,p_amount_cents,trim(p_reason));
end $$;
create or replace function public.tenotemo_admin_reward_paid(p_reward_id bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not (select public.tenotemo_is_admin()) then raise exception 'Admin only'; end if;
 update public.tenotemo_earn_rewards set status='paid',paid_at=now() where id=p_reward_id and status='approved';
 if not found then raise exception 'Reward missing or already paid'; end if;
end $$;
revoke all on function public.tenotemo_rank_memory_credits(bigint),public.tenotemo_claim_memory_day(date),public.tenotemo_earn_home(),public.tenotemo_earn_join(uuid),public.tenotemo_earn_campaign_for_post(uuid),public.tenotemo_admin_company_package(uuid,text),public.tenotemo_admin_campaign(uuid,uuid,text,text,integer,integer,timestamptz),public.tenotemo_admin_reward(uuid,integer,text),public.tenotemo_admin_reward_paid(bigint) from public,anon;
grant execute on function public.tenotemo_rank_memory_credits(bigint),public.tenotemo_claim_memory_day(date),public.tenotemo_earn_home(),public.tenotemo_earn_join(uuid),public.tenotemo_earn_campaign_for_post(uuid),public.tenotemo_admin_company_package(uuid,text),public.tenotemo_admin_campaign(uuid,uuid,text,text,integer,integer,timestamptz),public.tenotemo_admin_reward(uuid,integer,text),public.tenotemo_admin_reward_paid(bigint) to authenticated;
-- Retire old subscriber-only cash-prize settlement entry points; do not erase history.
do $$ begin
 if to_regprocedure('public.tenotemo_settle_daily_awards()') is not null then
  revoke execute on function public.tenotemo_settle_daily_awards() from public,anon,authenticated;
 end if;
 if to_regprocedure('public.tenotemo_daily_leaderboard(integer)') is not null then
  revoke execute on function public.tenotemo_daily_leaderboard(integer) from public,anon,authenticated;
 end if;
end $$;
commit;
