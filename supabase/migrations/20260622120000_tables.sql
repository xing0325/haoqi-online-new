-- 好奇 Online 首切片 schema：roster + profiles + 课程域表（含软删除）。
-- 命名遵循 spec §3 / §5.2。领域表用 PascalCase 加双引号；roster/profiles 用小写（Supabase 习惯）。
-- 仅建首切片真正接真数据的表：登录身份 + 官方课表 + 课程动态。积分/项目/阅读/活动等不建表。

-- ===== roster（花名册，email 为键，登录前就存在）=====
create table public.roster (
  email              text primary key,            -- 统一 lower(trim()) 存储
  display_name       text not null,
  role               text not null default 'student' check (role in ('student','teacher','admin')),
  roster_ref         text,
  course_short_names text[],
  course_role        text not null default 'member' check (course_role in ('member','teacher','assistant')),
  invited_at         timestamptz,
  created_at         timestamptz not null default now()
);

-- ===== profiles（= 领域对象 User，权威字段表，§5.2）=====
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text unique,
  display_name   text not null,
  avatar_url     text,
  role           text not null default 'student' check (role in ('student','teacher','admin')),
  account_status text not null default 'invited' check (account_status in ('invited','active','suspended')),
  bio            text,
  roster_ref     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ===== Term（学期）=====
create table public."Term" (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  starts_on date not null,
  ends_on   date not null check (ends_on >= starts_on),
  is_active boolean not null default false
);
-- 同一时刻至多一个 active term
create unique index term_one_active on public."Term"(is_active) where is_active;

-- ===== Course（课程，实体永驻）=====
create table public."Course" (
  id          uuid primary key default gen_random_uuid(),
  term_id     uuid not null references public."Term"(id),
  name        text not null,
  short_name  text,
  avatar_url  text,
  description text,
  owner_id    uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index course_term_idx on public."Course"(term_id);

-- ===== CourseMembership（选课/任课关系）=====
create table public."CourseMembership" (
  course_id  uuid not null references public."Course"(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('member','teacher','assistant')),
  created_at timestamptz not null default now(),
  primary key (course_id, user_id)
);
create index cm_user_idx on public."CourseMembership"(user_id);

-- ===== ScheduleSlot（官方课表时段，只读层）=====
create table public."ScheduleSlot" (
  id        uuid primary key default gen_random_uuid(),
  term_id   uuid not null references public."Term"(id),
  course_id uuid references public."Course"(id),   -- 可空：slot_kind='free' 留白时段
  weekday   smallint not null check (weekday between 1 and 7),  -- 1=周一
  starts_at time not null,
  ends_at   time not null check (ends_at > starts_at),
  slot_kind text not null check (slot_kind in ('required','large_elective','small_elective','free'))
);
create index slot_term_idx on public."ScheduleSlot"(term_id);

-- ===== ScheduleChange（调课，追加不覆写）=====
create table public."ScheduleChange" (
  id            uuid primary key default gen_random_uuid(),
  slot_id       uuid not null references public."ScheduleSlot"(id),  -- 始终指向原时段，入口不丢
  occurs_on     date not null,
  change_type   text not null check (change_type in ('location','time','cancelled','note')),
  message       text not null,
  new_location  text,
  new_starts_at time,
  new_ends_at   time,
  published_by  uuid not null references public.profiles(id),
  published_at  timestamptz not null default now(),
  deleted_at    timestamptz
);
create index schedchange_slot_idx on public."ScheduleChange"(slot_id, occurs_on) where deleted_at is null;

-- ===== Post（课程动态）=====
create table public."Post" (
  id            uuid primary key default gen_random_uuid(),
  space_type    text not null check (space_type in ('course')),  -- 后续切片再扩枚举
  space_id      uuid not null,                                   -- space_type='course' 时 = Course.id（多态，无 FK）
  title         text not null,
  body_markdown text,
  author_id     uuid not null references public.profiles(id),
  status        text not null default 'draft' check (status in ('draft','published')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index post_feed_idx on public."Post"(published_at desc) where status = 'published' and deleted_at is null;
create index post_space_idx on public."Post"(space_id);

-- ===== PostAsset（帖子图片，首切片只做 image）=====
create table public."PostAsset" (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public."Post"(id) on delete cascade,
  storage_key text not null,                       -- 约定 posts/{postId}/{filename}
  asset_type  text not null check (asset_type in ('image','pdf','document','spreadsheet','link')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index asset_post_idx on public."PostAsset"(post_id);

-- ===== Comment（评论，独立栏）=====
create table public."Comment" (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public."Post"(id) on delete cascade,
  author_id  uuid not null references public.profiles(id),
  body       text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index comment_post_idx on public."Comment"(post_id) where deleted_at is null;
