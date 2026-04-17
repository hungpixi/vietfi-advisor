-- Security baseline for VietFi user-owned finance data.
-- Idempotent by design so it can be applied to existing Supabase projects.

do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;
    alter table public.profiles force row level security;

    drop policy if exists profiles_own_all on public.profiles;
    create policy profiles_own_all
      on public.profiles
      for all
      to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()));

    drop policy if exists profiles_own_guard on public.profiles;
    create policy profiles_own_guard
      on public.profiles
      as restrictive
      for all
      to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()));
  end if;

  if to_regclass('public.gamification') is not null then
    alter table public.gamification enable row level security;
    alter table public.gamification force row level security;

    drop policy if exists gamification_own_all on public.gamification;
    create policy gamification_own_all
      on public.gamification
      for all
      to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()));

    drop policy if exists gamification_own_guard on public.gamification;
    create policy gamification_own_guard
      on public.gamification
      as restrictive
      for all
      to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()));
  end if;

  if to_regclass('public.budget_pots') is not null then
    alter table public.budget_pots enable row level security;
    alter table public.budget_pots force row level security;
    create index if not exists budget_pots_user_id_idx on public.budget_pots (user_id);

    drop policy if exists budget_pots_own_all on public.budget_pots;
    create policy budget_pots_own_all
      on public.budget_pots
      for all
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));

    drop policy if exists budget_pots_own_guard on public.budget_pots;
    create policy budget_pots_own_guard
      on public.budget_pots
      as restrictive
      for all
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;

  if to_regclass('public.expenses') is not null then
    alter table public.expenses enable row level security;
    alter table public.expenses force row level security;
    create index if not exists expenses_user_id_idx on public.expenses (user_id);

    drop policy if exists expenses_own_all on public.expenses;
    create policy expenses_own_all
      on public.expenses
      for all
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));

    drop policy if exists expenses_own_guard on public.expenses;
    create policy expenses_own_guard
      on public.expenses
      as restrictive
      for all
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;

  if to_regclass('public.debts') is not null then
    alter table public.debts enable row level security;
    alter table public.debts force row level security;
    create index if not exists debts_user_id_idx on public.debts (user_id);

    drop policy if exists debts_own_all on public.debts;
    create policy debts_own_all
      on public.debts
      for all
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));

    drop policy if exists debts_own_guard on public.debts;
    create policy debts_own_guard
      on public.debts
      as restrictive
      for all
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end $$;
