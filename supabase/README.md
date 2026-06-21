# Supabase（好奇 Online 数据层）

架构：**静态前端 + 客户端 Supabase**。前端是 GitHub Pages 上的静态站，后端就是 Supabase 托管服务。
**安全全靠数据库 RLS**（没有服务端可信层），所以 `migrations/` 里的策略一条都不能少。

## 套用到云项目（拿到 keys 后）

1. 在 [supabase.com](https://supabase.com) 建项目（Region 选 Singapore / Tokyo），拿：
   - Project ref（项目 URL `https://<ref>.supabase.co` 里的 `<ref>`）
   - `anon` key、`service_role` key（Settings → API）
2. keys 写进**仓库根** `.env.local`（已 gitignore，不进仓库）：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   ```
3. 套用迁移：
   ```
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   > `storage.objects` 上的策略若因属主权限（`supabase_storage_admin`）push 失败，
   > 把 `migrations/20260622120400_storage.sql` 的内容贴进 Dashboard → SQL Editor 手动跑一遍。
4. 灌种子（建演示用户 + 课程 + 动态；用 service_role，**仅本机跑**）：
   ```
   node scripts/seed.mjs
   ```
5. 跑 RLS 测试做真验证（含「学生看不到草稿 / 不能自提 admin」等负样本）：
   ```
   npm run test -- tests/db
   ```

## migrations/

| 文件 | 内容 |
| --- | --- |
| `20260622120000_tables.sql` | roster/profiles + 课程域 9 表（软删除 `deleted_at`） |
| `20260622120100_functions.sql` | `auth_role/is_admin/course_role/can_post_course/post_is_readable`（SECURITY DEFINER 加固） |
| `20260622120200_triggers.sql` | 不可变列锁 + `published_at` 维护 + `auth.users`→profile |
| `20260622120300_rls.sql` | 逐表 RLS 策略 |
| `20260622120400_storage.sql` | 私有 bucket `post-assets` + `storage.objects` RLS |

设计依据：`docs/specs/2026-06-21-haoqi-online-first-slice-design.md` §3 与 §5.2/§5.3。
