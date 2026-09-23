-- TENOTEMO EARN: 60/40 advertiser allocation and previous-day credits leaderboard.
-- Apply AFTER tenotemo_earn_migration.sql and tenotemo_individual_advertisers_update.sql.
-- Safe to rerun. Existing campaign reward budgets and historic Memory Credit claims are preserved.
begin;
alter table public.tenotemo_company_packages add column if not exists reward_allowance_cents integer not null default 0 check(reward_allowance_cents>=0);
-- Existing packages receive their new allowance without changing existing campaign budgets.
update public.tenotemo_company_packages set reward_allowance_cents=case package_key
 when 'individual' then 6000 when 'starter' then 30000 when 'growth' then 90000 when 'premium' then 300000 else 0 end;
create or replace function public.tenotemo_admin_company_package(p_company_id uuid,p_package text)
returns void language plpgsql security definer set search_path='' as $$
declare credits integer; allowance integer;
begin
 if not (select public.tenotemo_is_admin()) then raise exception 'Admin only'; end if;
 credits:=case p_package when 'individual' then 10 when 'starter' then 50 when 'growth' then 200 when 'premium' then 750 else null end;
 if credits is null then raise exception 'Unknown package'; end if;
 allowance:=case p_package when 'individual' then 6000 when 'starter' then 30000 when 'growth' then 90000 when 'premium' then 300000 end;
 if not exists(select 1 from auth.users where id=p_company_id) then raise exception 'Advertiser account missing'; end if;
 insert into public.tenotemo_spotlight_wallet(user_id,purchased_views) values(p_company_id,credits*100)
 on conflict(user_id) do update set purchased_views=public.tenotemo_spotlight_wallet.purchased_views+excluded.purchased_views,updated_at=now();
 insert into public.tenotemo_company_packages(user_id,package_key,expires_at,granted_spotlight_credits)
 values(p_company_id,p_package,now()+interval '1 month',credits)
 on conflict(user_id) do update set package_key=excluded.package_key,expires_at=excluded.expires_at,granted_spotlight_credits=excluded.granted_spotlight_credits;
 update public.tenotemo_company_packages set reward_allowance_cents=allowance where user_id=p_company_id;
end $$;
create or replace function public.tenotemo_admin_campaign(p_company_id uuid,p_post_id uuid,p_title text,p_description text,p_budget_cents integer,p_credit_cost integer,p_ends_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; allowance integer; used integer;
begin
 if not (select public.tenotemo_is_admin()) then raise exception 'Admin only'; end if;
 select reward_allowance_cents into allowance from public.tenotemo_company_packages where user_id=p_company_id and expires_at>now() for update;
 if allowance is null then raise exception 'Advertiser package inactive'; end if;
 select coalesce(sum(reward_budget_cents),0)::integer into used from public.tenotemo_earn_campaigns where company_id=p_company_id and status in ('active','paused') and ends_at>now();
 if p_budget_cents is null or p_budget_cents<0 or used+p_budget_cents>allowance then raise exception 'Reward budget exceeds remaining package allocation (R%)',greatest(allowance-used,0)/100.0; end if;
 if not exists(select 1 from public.tenotemo_spotlight_posts where id=p_post_id and user_id=p_company_id and status='approved') then raise exception 'Post must belong to company and be approved'; end if;
 if length(trim(coalesce(p_title,''))) not between 3 and 90 or length(coalesce(p_description,''))>350
 or p_budget_cents<0 or p_credit_cost not between 0 and 50 or p_ends_at<=now() then raise exception 'Invalid campaign details'; end if;
 insert into public.tenotemo_earn_campaigns(company_id,spotlight_post_id,title,description,reward_budget_cents,credit_cost,ends_at,status)
 values(p_company_id,p_post_id,trim(p_title),coalesce(p_description,''),p_budget_cents,p_credit_cost,p_ends_at,'active') returning id into cid;
 return cid;
end $$;

-- This RPC uses exactly the same score order and bonus scale as tenotemo_claim_memory_day.
-- The prior day's credits are DISPLAYED without modifying the wallet; claiming adds them once.
create or replace function public.tenotemo_memory_day_leaderboard(p_date date,p_limit integer default 50)
returns table(user_id uuid,player_name text,daily_points bigint,"position" bigint,
 completion_credits integer,top50_credits integer,total_credits integer,claimed boolean)
language plpgsql stable security definer set search_path='' as $$
declare today_za date:=(now() at time zone 'Africa/Johannesburg')::date;
begin
 if (select auth.uid()) is null then raise exception 'Sign in required'; end if;
 if p_date is null or p_date>=today_za or p_date<today_za-30 then
  raise exception 'Choose a completed day within the last 30 days';
 end if;
 return query with scores as (
  select b.user_id,sum(b.best_points)::bigint pts,max(b.updated_at) last_update,
   count(*) filter(where b.best_points>0)::integer completed
  from public.tenotemo_normal_daily_best b where b.score_date=p_date
  group by b.user_id
 ), ranked as (
  select s.user_id,s.pts,s.completed,
   row_number() over(order by s.pts desc,s.last_update asc,s.user_id) pos
  from scores s where s.pts>0
 )
 select r.user_id,coalesce(p.player_name,'Player')::text,r.pts,r.pos,
  (r.completed+case when r.completed=5 then 2 else 0 end)::integer,
  public.tenotemo_rank_memory_credits(r.pos),
  (r.completed+case when r.completed=5 then 2 else 0 end+public.tenotemo_rank_memory_credits(r.pos))::integer,
  (c.user_id is not null and r.user_id=(select auth.uid()))
 from ranked r left join public.tenotemo_profiles p on p.user_id=r.user_id
 left join public.tenotemo_memory_claims c on c.user_id=r.user_id and c.score_date=p_date
 order by r.pos limit least(greatest(coalesce(p_limit,50),1),50);
end $$;
revoke all on function public.tenotemo_memory_day_leaderboard(date,integer) from public,anon;
grant execute on function public.tenotemo_memory_day_leaderboard(date,integer) to authenticated;
notify pgrst,'reload schema';
commit;
