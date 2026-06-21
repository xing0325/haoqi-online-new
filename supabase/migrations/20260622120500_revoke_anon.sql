-- 不变量 #10：未登录（anon 角色）一律读不到任何业务数据。
-- spec §3.7 的 Post select 用 `status='published' or ...`，对 anon 也成立（anon 时 auth.uid() 为 null，
-- published 分支仍为真），会让未登录直接读到已发布帖。最稳的兜底是收回 anon 对 public 的全部权限：
-- 已登录请求走 authenticated 角色（权限保留，RLS 照常生效），未登录走 anon 角色（无任何表权限 → 一律拒绝）。
-- 首切片无游客页；将来要做游客页时，再对特定表/视图按需放开 anon 并配套只读策略。

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines in schema public from anon;

-- 之后由 postgres 在 public 新建的对象，默认也不授予 anon
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on routines from anon;
