-- 日历切片 1.9：个人任务（停车场用）。与未来做事空间的 ProjectTask 分开。仅本人可见可改。
create table public."Task" (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz,
  status text not null default 'todo' check (status in ('todo', 'done')),
  scheduled_event_id uuid references public."Event"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index task_owner_idx on public."Task"(owner_id) where deleted_at is null;

alter table public."Task" enable row level security;

-- 个人任务：仅本人 CRUD
create policy task_select on public."Task" for select using (owner_id = auth.uid());
create policy task_insert on public."Task" for insert with check (owner_id = auth.uid());
create policy task_update on public."Task" for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy task_delete on public."Task" for delete using (owner_id = auth.uid());

-- 通用 updated_at 触发器（不能复用 tg_event_guard：那个查 Event 专属列会报错）
create or replace function public.tg_touch_updated() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger task_touch before update on public."Task"
  for each row execute function public.tg_touch_updated();
