-- 日历切片 1：Calendar（私人/工作，可公开）+ Event（真实事件 vs 计划时间块，软删）。
-- 课表仍用只读 ScheduleSlot，不在此表。安全靠 RLS（客户端 Supabase 架构）。

create table public."Calendar" (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('personal', 'work')),
  color text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);
create index calendar_owner_idx on public."Calendar"(owner_id);

create table public."Event" (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public."Calendar"(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at >= starts_at),
  all_day boolean not null default false,
  kind text not null default 'event' check (kind in ('event', 'timeblock')),
  status text not null default 'confirmed' check (status in ('draft', 'confirmed', 'done', 'cancelled')),
  location text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index event_cal_idx on public."Event"(calendar_id);
create index event_range_idx on public."Event"(starts_at) where deleted_at is null;

alter table public."Calendar" enable row level security;
alter table public."Event" enable row level security;

-- Calendar：本人可 CRUD；公开日历全员可读
create policy cal_select on public."Calendar" for select
  using (auth.uid() is not null and (owner_id = auth.uid() or visibility = 'public'));
create policy cal_insert on public."Calendar" for insert with check (owner_id = auth.uid());
create policy cal_update on public."Calendar" for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy cal_delete on public."Calendar" for delete using (owner_id = auth.uid());

-- Event：父日历可见才可读；只能往自己的日历写
create policy event_select on public."Event" for select using (
  deleted_at is null and exists (
    select 1 from public."Calendar" c
    where c.id = calendar_id and (c.owner_id = auth.uid() or c.visibility = 'public')
  )
);
create policy event_insert on public."Event" for insert with check (
  created_by = auth.uid() and exists (
    select 1 from public."Calendar" c where c.id = calendar_id and c.owner_id = auth.uid()
  )
);
create policy event_update on public."Event" for update
  using (exists (select 1 from public."Calendar" c where c.id = calendar_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public."Calendar" c where c.id = calendar_id and c.owner_id = auth.uid()));

-- 不可变列 + updated_at
create function public.tg_event_guard() returns trigger language plpgsql as $$
begin
  if new.calendar_id is distinct from old.calendar_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Event: calendar_id/created_by/created_at 不可修改';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger event_guard before update on public."Event"
  for each row execute function public.tg_event_guard();
