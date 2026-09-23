-- TENOTEMO EARN: INDIVIDUAL ADVERTISERS UPDATE.
-- Run ONCE after the original Tenotemo Earn pilot migration, or after the updated full migration.
-- Does not change player Premium or automatically grant any paid credits.
begin;
create table if not exists public.tenotemo_advertiser_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 account_type text not null check(account_type in ('individual','company')),
 display_name text not null check(length(display_name) between 2 and 90),
 service_description text not null check(length(service_description) between 3 and 200),
 service_area text not null check(length(service_area) between 2 and 100),
 preferred_package text not null check(preferred_package in ('individual','starter','growth','premium')),
 updated_at timestamptz not null default now()
);
alter table public.tenotemo_advertiser_profiles enable row level security;
revoke all on public.tenotemo_advertiser_profiles from public,anon,authenticated;
-- Replace only the named package check, without changing existing subscription records.
do $$ declare r record; begin
 for r in select conname from pg_constraint where conrelid='public.tenotemo_company_packages'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%package_key%' loop
  execute format('alter table public.tenotemo_company_packages drop constraint %I',r.conname);
 end loop;
 alter table public.tenotemo_company_packages add constraint tenotemo_company_packages_package_key_check
 check(package_key in ('individual','starter','growth','premium'));
end $$;
create or replace function public.tenotemo_advertiser_register(p_type text,p_name text,p_service text,p_area text,p_package text)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid());
begin
 if u is null then raise exception 'Sign in required'; end if;
 if p_type not in ('individual','company') or p_package not in ('individual','starter','growth','premium')
 or length(trim(coalesce(p_name,''))) not between 2 and 90
 or length(trim(coalesce(p_service,''))) not between 3 and 200
 or length(trim(coalesce(p_area,''))) not between 2 and 100 then raise exception 'Complete all advertiser fields'; end if;
 insert into public.tenotemo_advertiser_profiles(user_id,account_type,display_name,service_description,service_area,preferred_package)
 values(u,p_type,trim(p_name),trim(p_service),trim(p_area),p_package)
 on conflict(user_id) do update set account_type=excluded.account_type,display_name=excluded.display_name,
 service_description=excluded.service_description,service_area=excluded.service_area,
 preferred_package=excluded.preferred_package,updated_at=now();
end $$;
create or replace function public.tenotemo_admin_advertisers()
returns table(user_id uuid,account_type text,display_name text,service_description text,service_area text,preferred_package text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not (select public.tenotemo_is_admin()) then raise exception 'Admin only'; end if;
 return query select a.user_id,a.account_type,a.display_name,a.service_description,a.service_area,a.preferred_package
 from public.tenotemo_advertiser_profiles a order by a.updated_at desc limit 200;
end $$;
-- Existing tenotemo_earn_home and package grant functions are replaced in the updated full SQL;
-- incremental installs get the same implementations appended below.
create or replace function public.tenotemo_earn_home()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); result jsonb;
begin
 if u is null then raise exception 'Sign in required'; end if;
 select jsonb_build_object(
 'advertiser_profile',(select to_jsonb(a) from public.tenotemo_advertiser_profiles a where a.user_id=u),
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

create or replace function public.tenotemo_admin_company_package(p_company_id uuid,p_package text)
returns void language plpgsql security definer set search_path='' as $$
declare credits integer;
begin
 if not (select public.tenotemo_is_admin()) then raise exception 'Admin only'; end if;
 credits:=case p_package when 'individual' then 10 when 'starter' then 50 when 'growth' then 200 when 'premium' then 750 else null end;
 if credits is null then raise exception 'Unknown package'; end if;
 if not exists(select 1 from auth.users where id=p_company_id) then raise exception 'Advertiser account missing'; end if;
 insert into public.tenotemo_spotlight_wallet(user_id,purchased_views) values(p_company_id,credits*100)
 on conflict(user_id) do update set purchased_views=public.tenotemo_spotlight_wallet.purchased_views+excluded.purchased_views,updated_at=now();
 insert into public.tenotemo_company_packages(user_id,package_key,expires_at,granted_spotlight_credits)
 values(p_company_id,p_package,now()+interval '1 month',credits)
 on conflict(user_id) do update set package_key=excluded.package_key,expires_at=excluded.expires_at,granted_spotlight_credits=excluded.granted_spotlight_credits;
end $$;

revoke all on function public.tenotemo_advertiser_register(text,text,text,text,text),public.tenotemo_admin_advertisers() from public,anon;
grant execute on function public.tenotemo_advertiser_register(text,text,text,text,text),public.tenotemo_admin_advertisers() to authenticated;
commit;
