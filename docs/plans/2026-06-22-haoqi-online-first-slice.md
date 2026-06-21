# 好奇 Online 首切片 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务执行；step 用 - [ ] 复选框追踪。
>
> **来源与状态：** 本计划由多智能体工作流并行起草六个阶段，对抗评审（覆盖/一致性/占位/TDD 顺序）已完成；最终「逐条吸收评审+润色整合」因撞会话用量上限中断。**此为各阶段草稿的抢救拼装版**，可直接据以执行，已知待修点见下。额度恢复后可重跑整合润色。
>
> 设计 spec（唯一事实来源）：docs/specs/2026-06-21-haoqi-online-first-slice-design.md

**Goal:** 把「此刻」首页与「课程」空间从静态原型做成 Next.js + Supabase 真数据闭环，其余 5 空间诚实占位。

**Tech Stack:** Next.js(App Router)+TypeScript+Supabase(Postgres/Auth/Storage/RLS)+Vitest+Playwright；部署 Vercel+Supabase 云（本机无 Docker，用云项目，不跑本地 supabase start）。

---

## 执行前已知待修点（来自评审）
- **目录结构**：spec §4.1 用根级 `app/`，§6.1 误出现 `src/app/`。本仓库**已采用根级 `app/ lib/`（无 src/）**；草稿里凡 `src/` 前缀按根级改。
- **客户端命名唯一标准**：`lib/supabase/client.ts → createClient`、`server.ts → createClient`、`admin.ts → createAdminClient`。
- **Phase 4（首页）** 是网络中断后补跑的草稿，执行前对照 spec §2.1/§2.3 复核覆盖。
- **本地无 Docker**：草稿中 `supabase start` / `supabase db reset` 一律改为对接 Supabase 云项目（`supabase db push` 或 Studio 跑 SQL）。

---
## 阶段 0：工程地基（脚手架 / 测试 / 本地 Supabase / 部署）

> 本阶段交付物：一个能 `npm run dev / build / lint / test / test:e2e` 全绿、能部署到 Vercel + Supabase 云、本地能 `supabase start` 起 Postgres+Studio 的 Next.js(App Router)+TypeScript 工程骨架；原型迁进 `legacy-prototype/`；三个 Supabase 客户端骨架就位；环境变量与密钥边界机器化卡死。
>
> **权威依据：** 仓库整理＝spec §6.0；目标仓库结构＝spec §6.1（**以 §6.1 为准：Next 应用建在仓库根，源码在 `src/` 下**，§4.1 的目录树是逻辑示意，物理落在 `src/app` `src/components` `src/lib`）；客户端命名与安全＝§4.3 / 共享背景；部署＝§6.3；本地起跑＝§6.4；质量门槛＝§6.5。
>
> **已核对的当前事实（用 `git`/`ls` 验过）：** 远端 `origin=https://github.com/xing0325/haoqi-online-new.git`（默认 `main`，远端名不改）；本地 `C:/Users/david/haoqi-online`，当前分支 `docs/first-slice-spec`；原型 6 个前端文件在仓库根：`index.html / styles.css / modules.css / credits.css / interactions.css / app.js`；`HANDOFF_TO_CLAUDE.md` `README.md` 在根；`docs/` 已有 spec；`spec-preview.html` 已被 `.gitignore` 忽略；本机 `node v25.9.0` / `npm 11.12.1`，Supabase CLI 不在 PATH（统一用 `npx supabase`）。
>
> **本阶段满足的验收（§6.6）：** 主要服务于地基类条款 **F（视觉不回归——legacy 留底可对照）** 的前置、**§6.5 质量门槛全部**（build/lint/test 通过、密钥不进客户端的构建期硬卡点）、以及为 A–I 全部验收提供可运行的工程载体。不变量：`service_role` 永不进客户端 bundle（§4.3 安全红线）。
>
> **分支约定（§6.2）：** 本阶段任务从 `main` 切分支，按功能命名，不按作者名。各 Task 末尾给出 commit 命令；阶段内每个 Task 一个分支或合并到同一 `chore/phase0-scaffold` 分支由整合者决定，计划里默认每 Task 单独 commit。

---

### Task 1：仓库整理——原型迁入 `legacy-prototype/` 并改写 README（满足 §6.0；为验收 F 留设计参照底）

> 这是一次性仓库整理，独立先做，**不与 Next 脚手架混在一个 commit**（§6.0 铁律）。走执行 + 明确验证，不走 TDD。

**Files:**
- Create（目录）：`C:/Users/david/haoqi-online/legacy-prototype/`
- Move（git mv，保留历史）：`index.html` `styles.css` `modules.css` `credits.css` `interactions.css` `app.js` → `legacy-prototype/`
- Create：`C:/Users/david/haoqi-online/legacy-prototype/README.md`
- Modify：`C:/Users/david/haoqi-online/README.md`

**Steps:**

- [ ] 从 `main` 切分支：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b chore/move-legacy-prototype
  ```
  期望：`Switched to a new branch 'chore/move-legacy-prototype'`。

- [ ] 建目录并用 `git mv` 搬 6 个前端文件（保留历史）：
  ```bash
  cd /c/Users/david/haoqi-online
  mkdir -p legacy-prototype
  git mv index.html styles.css modules.css credits.css interactions.css app.js legacy-prototype/
  ```
  期望：`git status` 显示 6 个 `renamed:` 条目；`HANDOFF_TO_CLAUDE.md`、`README.md`、`docs/`、`spec-preview.html` 仍在根（spec-preview 仍被忽略）。

- [ ] 验证 6 文件已在 `legacy-prototype/` 且根目录无残留前端文件：
  ```bash
  cd /c/Users/david/haoqi-online && ls -1 legacy-prototype/ && echo "---ROOT---" && ls -1 *.html *.css *.js 2>/dev/null || echo "root clean of prototype files"
  ```
  期望：`legacy-prototype/` 列出 6 个文件；根目录除 `spec-preview.html`（被忽略、未删）外无 `index.html/styles.css/...`。

- [ ] 写 `legacy-prototype/README.md`（设计参照说明，§6.0 步骤 4）：
  ```markdown
  # legacy-prototype（只读设计参照 · 博物馆）

  这是「好奇 Online」最初的静态前端原型，是**视觉 / 文案 / 设计 token 的唯一权威来源**。

  ## 这是什么
  - 暖白纸感 + 海军蓝 + 黄/珊瑚/蓝/薄荷绿语义色的那一套外壳与信息架构。
  - 纯静态、无构建：直接用浏览器打开 `index.html` 即可对照视觉。

  ## 铁律（所有协作者必读）
  - **可读、可照搬 token / 卡片形状 / 文案口吻**到 Next 应用（`src/` 下）。
  - **禁止**在这里改 bug、接后端、加新功能、当线上代码跑。
  - Next 应用的纸感视觉 / 语义色 / 不规则手工感忠实对齐本目录，但任何人不许把新功能写进来。

  ## 本地查看
  ```powershell
  npx serve legacy-prototype
  ```
  或直接双击 `index.html`。

  ## 文件
  - `index.html` 页面结构与七空间外壳
  - `styles.css` 全局设计 token（`:root` 变量）+ 外壳样式（移植 `src/app/globals.css` 的来源）
  - `modules.css` 各模块卡片样式（移植各 CSS Module 的来源）
  - `credits.css` 积分卡等装饰样式
  - `interactions.css` 交互态样式
  - `app.js` 原型 hash 路由与交互（Next 用 App Router 替代，仅作参照）
  ```

- [ ] 改写根 `README.md`（顶部声明 Next 应用 + legacy 只读 + §6.4 本地起跑）。完整新内容：
  ```markdown
  # 好奇 Online

  把好奇学习社区的课程、正在发生的事、阅读、活动和日常，变成一个轻巧、鲜活、可留痕的线上共同空间。

  > **本仓库根目录是 Next.js (App Router) 应用。** 源码在 `src/` 下，迁移 / 部署 / 数据模型规格见 `docs/specs/`。
  > `legacy-prototype/` 是**只读设计参照（博物馆）**，是视觉 / 文案 / token 的唯一权威来源——**禁止在其上继续加功能或接后端**。
  > 产品事实来源：`HANDOFF_TO_CLAUDE.md`（留在仓库根）。

  ## 本地起跑

  ```powershell
  git clone https://github.com/xing0325/haoqi-online-new.git
  cd haoqi-online-new        # 本地副本目录名可能是 haoqi-online，以实际为准
  npm install
  Copy-Item .env.example .env.local   # 填入 Supabase URL + anon key（找负责人要）
  npm run dev                 # 打开输出的 http://localhost:3000/
  ```

  老原型不需构建，对照视觉直接浏览器打开 `legacy-prototype/index.html`。

  ## 本地数据库（Supabase CLI）

  ```powershell
  npx supabase start          # 起本地 Postgres + Studio（首次会拉 Docker 镜像）
  npx supabase db reset       # 跑 migrations + seed.sql，重置到干净示例数据
  npx supabase stop           # 收工
  ```

  ## 常用命令

  | 命令 | 作用 |
  | --- | --- |
  | `npm run dev` | 本地开发服务器（http://localhost:3000/） |
  | `npm run build` | 生产构建（类型/构建错误即失败，合并前必过） |
  | `npm run lint` | ESLint + TypeScript 检查 |
  | `npm run test` | 单元/组件测试（Vitest，一次性 run） |
  | `npm run test:e2e` | 端到端验收测试（Playwright） |

  ## 协作纪律（详见 `docs/specs/` §6.2）

  - 先拉再开工：`git checkout main && git pull`；一任务一 issue；从 `main` 切**按功能命名**的分支（不按作者名）。
  - PR 必带 `Closes #编号`，写清改了什么、**没做什么**（诚实标占位）、怎么验证。
  - 改地基文件（`src/app/layout.tsx` / `src/app/globals.css` / `src/lib/supabase/*` / `supabase/`）前先开 issue。
  - **禁止**：强推 `main`、`--no-verify` 跳钩子、提交 `.env.local` 或任何真密钥。
  ```

- [ ] 验证 README 链接可点（本地 file:/// 自查，满足用户 HTML/链接习惯）并确认无残留旧文案：
  ```bash
  cd /c/Users/david/haoqi-online && grep -c "npx serve ." README.md && echo "expect 0 (old line removed)"
  ```
  期望：输出 `0`（旧 `npx serve .` 行已被替换为 Next 起跑步骤）。

- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add -A
  git commit -m "chore: 原型迁入 legacy-prototype/ 并改写 README 为 Next 起跑

  - git mv 6 个前端文件保留历史；HANDOFF/docs 留根
  - legacy-prototype/README.md 标注只读设计参照博物馆铁律
  - 根 README 改为 Next 本地起跑 + Supabase CLI + 协作纪律
  满足 spec §6.0 / §6.4

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 2：Next.js (App Router) + TypeScript 脚手架（package.json / tsconfig / next.config）

> 不用 `create-next-app` 交互式向导（环境不支持交互），改为**手写最小确定性配置**，避免脚手架带进我们不想要的版本漂移。走执行 + 明确验证（`npm run build` / `npm run dev` 通过）。

**Files:**
- Create：`C:/Users/david/haoqi-online/package.json`
- Create：`C:/Users/david/haoqi-online/tsconfig.json`
- Create：`C:/Users/david/haoqi-online/next.config.ts`
- Create：`C:/Users/david/haoqi-online/next-env.d.ts`
- Create：`C:/Users/david/haoqi-online/src/app/layout.tsx`
- Create：`C:/Users/david/haoqi-online/src/app/page.tsx`
- Create：`C:/Users/david/haoqi-online/src/app/globals.css`
- Modify：`C:/Users/david/haoqi-online/.gitignore`

**Steps:**

- [ ] 从 `main` 切分支：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b chore/next-scaffold
  ```
  期望：`Switched to a new branch 'chore/next-scaffold'`。

- [ ] 写 `package.json`（锁版本号；脚本含 dev/build/start/lint/test/test:e2e/typecheck/db）：
  ```json
  {
    "name": "haoqi-online",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint",
      "typecheck": "tsc --noEmit",
      "test": "vitest run",
      "test:watch": "vitest",
      "test:e2e": "playwright test",
      "db:start": "supabase start",
      "db:reset": "supabase db reset",
      "db:types": "supabase gen types typescript --local > src/lib/types.gen.ts"
    },
    "dependencies": {
      "next": "15.1.6",
      "react": "19.0.0",
      "react-dom": "19.0.0",
      "@supabase/ssr": "0.5.2",
      "@supabase/supabase-js": "2.48.1",
      "server-only": "0.0.1"
    },
    "devDependencies": {
      "typescript": "5.7.3",
      "@types/node": "22.10.7",
      "@types/react": "19.0.7",
      "@types/react-dom": "19.0.3",
      "eslint": "9.18.0",
      "eslint-config-next": "15.1.6",
      "@vitejs/plugin-react": "4.3.4",
      "vitest": "3.0.4",
      "jsdom": "26.0.0",
      "@testing-library/react": "16.2.0",
      "@testing-library/jest-dom": "6.6.3",
      "@testing-library/user-event": "14.6.1",
      "@playwright/test": "1.50.0"
    }
  }
  ```

- [ ] 写 `tsconfig.json`（严格模式；`@/*` → `src/*` 路径别名；满足 §4.6「`tsc --noEmit` 严格模式必过」）：
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["dom", "dom.iterable", "esnext"],
      "allowJs": false,
      "skipLibCheck": true,
      "strict": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "verbatimModuleSyntax": false,
      "plugins": [{ "name": "next" }],
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules", "legacy-prototype"]
  }
  ```

- [ ] 写 `next.config.ts`（最小配置；显式 `reactStrictMode`，预留 Supabase Storage 图片 host 注释位但不写死域名）：
  ```ts
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    reactStrictMode: true,
    // Supabase Storage 签名 URL 用 <img> 直出，本切片不接 next/image 远程域名白名单；
    // 若后续切片用 next/image 远程图，在此补 images.remotePatterns（host 来自 NEXT_PUBLIC_SUPABASE_URL）。
  };

  export default nextConfig;
  ```

- [ ] 写 `next-env.d.ts`（Next 要求存在，内容固定，勿手改）：
  ```ts
  /// <reference types="next" />
  /// <reference types="next/image-types/global" />

  // NOTE: This file should not be edited
  // see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
  ```

- [ ] 写 `src/app/globals.css`（本阶段只放最小 reset + 一个占位 token，真正的设计 token 移植在后续阶段从 `legacy-prototype/styles.css` 的 `:root` 整块搬入，这里只保证 build 不空）：
  ```css
  :root {
    --paper: #f4f1ea;
    --ink: #1f2933;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
  }

  body {
    background: var(--paper);
    color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC",
      "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: inherit;
  }

  button {
    font: inherit;
  }
  ```

- [ ] 写根布局 `src/app/layout.tsx`（引一次 globals.css；中文 `lang`）：
  ```tsx
  import type { Metadata } from "next";
  import "./globals.css";

  export const metadata: Metadata = {
    title: "好奇 Online",
    description: "好奇学习社区的线上共同空间",
  };

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="zh-CN">
        <body>{children}</body>
      </html>
    );
  }
  ```

- [ ] 写临时首页 `src/app/page.tsx`（脚手架自检页，后续阶段被真首页替换）：
  ```tsx
  export default function Home() {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>好奇 Online</h1>
        <p>工程脚手架就绪。真实首页在后续阶段实现。</p>
      </main>
    );
  }
  ```

- [ ] 在 `.gitignore` 末尾追加 Next/测试产物忽略（保留原有行，新增 Playwright/Vitest 输出与 TS 构建信息文件）：
  ```gitignore
  # next / test artifacts
  next-env.d.ts
  *.tsbuildinfo
  /playwright-report/
  /test-results/
  /coverage/
  ```
  > 注：`.next/` `out/` `build/` `.env*` `.vercel` 已在原 `.gitignore`，不重复加。`next-env.d.ts` 由 Next 自动生成，忽略它（已手写一份保证首次 typecheck 通过，提交与否不影响，统一忽略）。

- [ ] 安装依赖并验证 build + lint：
  ```bash
  cd /c/Users/david/haoqi-online
  npm install
  npm run build
  ```
  期望：`npm install` 成功生成 `node_modules/` 与 `package-lock.json`；`npm run build` 末尾出现 `✓ Compiled successfully` 与路由表（含 `/`）。`lint` 配置在 Task 4 补 `.eslintrc`，本步先确保 build 通过即可。

- [ ] 验证 dev server 能起（后台起 8 秒后探活再关）：
  ```bash
  cd /c/Users/david/haoqi-online && (npm run dev >/tmp/haoqi-dev.log 2>&1 &) && sleep 8 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ ; pkill -f "next dev" 2>/dev/null; echo " <- expect 200"
  ```
  期望：输出 `200 <- expect 200`（首页可访问）。

- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add -A
  git commit -m "chore: Next.js App Router + TypeScript 脚手架

  - package.json 锁版本 + dev/build/lint/test/test:e2e/db 脚本
  - tsconfig 严格模式 + @/* → src/* 别名（满足 §4.6 tsc 严格）
  - next.config.ts / 根 layout / globals.css 最小 reset / 自检首页
  - .gitignore 补 next/test 产物
  满足 spec §6.1 / §6.5

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 3：ESLint + Prettier + `service_role` 不进客户端的机器化卡点（满足 §4.3 / §6.5 硬卡点）

> 把 spec §4.3 安全红线「`service_role` 永不进客户端」「ESLint `no-restricted-imports` 禁止非 server-only 文件 import `lib/supabase/admin`」从口头纪律变成构建期失败。走执行 + 明确验证（故意写违规代码看 lint 报错，再删除）。

**Files:**
- Create：`C:/Users/david/haoqi-online/eslint.config.mjs`
- Create：`C:/Users/david/haoqi-online/.prettierrc.json`
- Create：`C:/Users/david/haoqi-online/.prettierignore`
- Create：`C:/Users/david/haoqi-online/scripts/check-no-service-role-in-client.mjs`
- Modify：`C:/Users/david/haoqi-online/package.json`（加 `format` 与 `check:secrets` 脚本、devDeps 加 prettier）

**Steps:**

- [ ] 从 `main` 切分支：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b chore/lint-format-secret-guard
  ```

- [ ] 在 `package.json` 的 `devDependencies` 增加 prettier 与 eslint flat-config 依赖，并在 `scripts` 增加 `format` 与 `check:secrets`。改动后相关片段应为：
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\" \"*.{ts,mjs,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\" \"*.{ts,mjs,json}\"",
    "check:secrets": "node scripts/check-no-service-role-in-client.mjs",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:start": "supabase start",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > src/lib/types.gen.ts"
  },
  ```
  并在 `devDependencies` 加：
  ```json
  "prettier": "3.4.2",
  "eslint-plugin-import": "2.31.0"
  ```
  （用 Edit 精确插入这两行到 devDependencies 块内，保持 JSON 合法。）

- [ ] 写 `eslint.config.mjs`（flat config，继承 `next/core-web-vitals`；加 `no-restricted-imports` 禁止从 `@/lib/supabase/admin` 与相对路径 import admin 客户端，仅在文件名标记 server-only 时豁免——本切片采用「全局禁止 + admin.ts 自身豁免」策略）：
  ```js
  import { FlatCompat } from "@eslint/eslintrc";
  import { dirname } from "path";
  import { fileURLToPath } from "url";

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const compat = new FlatCompat({ baseDirectory: __dirname });

  const eslintConfig = [
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
      ignores: [
        "legacy-prototype/**",
        ".next/**",
        "node_modules/**",
        "playwright-report/**",
        "test-results/**",
        "src/lib/types.gen.ts",
      ],
    },
    {
      // 安全红线（§4.3）：禁止任何文件 import service-role admin 客户端，
      // 唯一合法引用点是 lib/supabase/admin.ts 内部（它自身不 import 自己），
      // 以及显式服务端文件——本切片用全局禁止，需要用 admin 的服务端代码集中走 createAdminClient 调用方在 server-only 文件里，
      // 由下方 overrides 对 lib/supabase/admin.ts 之外的 import 报错。
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["**/lib/supabase/admin", "@/lib/supabase/admin"],
                message:
                  "service-role 客户端只能在服务端 server-only 文件里用。若确需，请在该文件顶部加 import 'server-only' 并把本规则在该文件用 eslint-disable-next-line no-restricted-imports 显式豁免，并写明理由。",
              },
            ],
          },
        ],
      },
    },
  ];

  export default eslintConfig;
  ```
  > devDeps 还需 `@eslint/eslintrc`（`next lint` flat 配置桥接所需）。在 `package.json` devDependencies 追加 `"@eslint/eslintrc": "3.2.0"`。

- [ ] 写 `.prettierrc.json`：
  ```json
  {
    "semi": true,
    "singleQuote": false,
    "trailingComma": "all",
    "printWidth": 80,
    "tabWidth": 2
  }
  ```

- [ ] 写 `.prettierignore`：
  ```gitignore
  legacy-prototype/
  .next/
  node_modules/
  playwright-report/
  test-results/
  coverage/
  src/lib/types.gen.ts
  package-lock.json
  ```

- [ ] 写 `scripts/check-no-service-role-in-client.mjs`（§4.3「CI grep：`service_role` 出现在 `NEXT_PUBLIC_` 或 client bundle 即 fail」的机器化实现——构建后扫描 `.next/static` 客户端 bundle，命中 `service_role` 字面量或 `SUPABASE_SERVICE_ROLE_KEY` 即非零退出）：
  ```js
  // 扫描已构建的客户端 bundle，确保 service-role 密钥/字面量绝不下发浏览器（spec §4.3 安全红线）。
  // 用法：先 `npm run build`，再 `npm run check:secrets`。CI 在 build 后跑本脚本。
  import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
  import { join } from "node:path";

  const CLIENT_DIR = ".next/static";
  const NEEDLES = ["service_role", "SUPABASE_SERVICE_ROLE_KEY"];

  if (!existsSync(CLIENT_DIR)) {
    console.error(
      `[check:secrets] 未找到 ${CLIENT_DIR}，请先运行 \`npm run build\`。`,
    );
    process.exit(1);
  }

  /** 递归收集目录下所有文件路径 */
  function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        out.push(...walk(full));
      } else {
        out.push(full);
      }
    }
    return out;
  }

  const offenders = [];
  for (const file of walk(CLIENT_DIR)) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue; // 二进制/读不了的跳过
    }
    for (const needle of NEEDLES) {
      if (content.includes(needle)) {
        offenders.push({ file, needle });
      }
    }
  }

  if (offenders.length > 0) {
    console.error("[check:secrets] 失败：客户端 bundle 命中敏感字面量：");
    for (const o of offenders) {
      console.error(`  - ${o.file} 含 "${o.needle}"`);
    }
    process.exit(1);
  }

  console.log("[check:secrets] 通过：客户端 bundle 未发现 service-role 密钥。");
  process.exit(0);
  ```

- [ ] 安装新依赖：
  ```bash
  cd /c/Users/david/haoqi-online && npm install
  ```
  期望：装上 `prettier`、`@eslint/eslintrc`、`eslint-plugin-import`。

- [ ] 验证 lint 与 format:check 通过：
  ```bash
  cd /c/Users/david/haoqi-online && npm run lint && npm run format:check
  ```
  期望：`lint` 输出 `✔ No ESLint warnings or errors`（或无报错退出 0）；`format:check` 通过（如不过先跑 `npm run format` 再提交）。

- [ ] 验证 `no-restricted-imports` 真的会拦（先红）：临时建一个违规文件，跑 lint 看它报错，然后删除：
  ```bash
  cd /c/Users/david/haoqi-online
  mkdir -p src/lib
  printf "import { createAdminClient } from \"@/lib/supabase/admin\";\nexport const x = createAdminClient;\n" > src/_lint_probe.ts
  npm run lint; echo "EXIT=$?  <- expect non-zero (rule fired)"
  rm -f src/_lint_probe.ts
  npm run lint; echo "EXIT=$?  <- expect 0 after removing probe"
  ```
  期望：含探针文件时 lint 非零退出并指出 `no-restricted-imports`；删除后 lint 退出 0。

- [ ] 验证 `check:secrets` 真的会拦（先红）：临时把字面量塞进一个会进客户端 bundle 的 client 组件，build 后扫描应失败，再删除还原：
  ```bash
  cd /c/Users/david/haoqi-online
  mkdir -p src/app/_probe
  printf "\"use client\";\nexport default function P(){return <span>{\"service_role\"}</span>;}\n" > src/app/_probe/page.tsx
  npm run build && (npm run check:secrets; echo "EXIT=$?  <- expect non-zero (leak caught)")
  rm -rf src/app/_probe
  npm run build && npm run check:secrets; echo "EXIT=$?  <- expect 0 after cleanup"
  ```
  期望：含探针时 `check:secrets` 非零退出并打印命中文件；清理后退出 0、打印「通过」。

- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add -A
  git commit -m "chore: ESLint + Prettier + service_role 不进客户端的构建期硬卡点

  - eslint flat config 继承 next/core-web-vitals + no-restricted-imports 禁 import admin 客户端
  - prettier 配置 + format/format:check 脚本
  - scripts/check-no-service-role-in-client.mjs 扫 .next/static 客户端 bundle
  - 已手测两条规则先红后绿
  满足 spec §4.3 安全红线 / §6.5 硬卡点

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 4：Vitest + @testing-library/react 安装配置 + smoke 测试（TDD 先红后绿）

> 本 Task 走 TDD：先写一个会失败的组件测试（被测组件还不存在 → 红），再写最小被测组件（绿）。建立单元/组件测试栈。

**Files:**
- Create：`C:/Users/david/haoqi-online/vitest.config.ts`
- Create：`C:/Users/david/haoqi-online/vitest.setup.ts`
- Create：`C:/Users/david/haoqi-online/src/components/ui/HelloMark.tsx`
- Test：`C:/Users/david/haoqi-online/src/components/ui/HelloMark.test.tsx`

**Steps:**

- [ ] 从 `main` 切分支：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b chore/vitest-setup
  ```

- [ ] 写 `vitest.config.ts`（jsdom 环境、引 setup、`@/*` 别名、排除 Playwright 的 e2e 目录与 legacy）：
  ```ts
  import { defineConfig } from "vitest/config";
  import react from "@vitejs/plugin-react";
  import { fileURLToPath } from "node:url";

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./vitest.setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["e2e/**", "node_modules/**", "legacy-prototype/**"],
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  });
  ```

- [ ] 写 `vitest.setup.ts`（接 jest-dom 匹配器 + 每个测试后清 DOM）：
  ```ts
  import "@testing-library/jest-dom/vitest";
  import { cleanup } from "@testing-library/react";
  import { afterEach } from "vitest";

  afterEach(() => {
    cleanup();
  });
  ```

- [ ] **先写失败测试** `src/components/ui/HelloMark.test.tsx`（此时 `HelloMark.tsx` 还不存在 → 应红）：
  ```tsx
  import { render, screen } from "@testing-library/react";
  import { describe, it, expect } from "vitest";
  import { HelloMark } from "./HelloMark";

  describe("HelloMark", () => {
    it("渲染传入的社区名并带可访问的 role", () => {
      render(<HelloMark name="好奇 Online" />);
      const mark = screen.getByRole("img", { name: "好奇 Online 标识" });
      expect(mark).toBeInTheDocument();
      expect(mark).toHaveTextContent("好奇 Online");
    });
  });
  ```

- [ ] **跑测试看它失败**：
  ```bash
  cd /c/Users/david/haoqi-online && npm run test
  ```
  期望：失败，报 `Failed to resolve import "./HelloMark"` 或找不到模块（红）。

- [ ] **写最小实现** `src/components/ui/HelloMark.tsx` 让测试转绿：
  ```tsx
  export function HelloMark({ name }: { name: string }) {
    return (
      <span role="img" aria-label={`${name} 标识`}>
        {name}
      </span>
    );
  }
  ```

- [ ] **再跑测试看通过**：
  ```bash
  cd /c/Users/david/haoqi-online && npm run test
  ```
  期望：`Test Files  1 passed (1)` / `Tests  1 passed (1)`（绿）。

- [ ] 确认 build 仍通过（新增文件不破坏构建）：
  ```bash
  cd /c/Users/david/haoqi-online && npm run build
  ```
  期望：`✓ Compiled successfully`。

- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add -A
  git commit -m "test: Vitest + @testing-library/react 测试栈 + smoke 组件测试

  - vitest.config.ts(jsdom + @/* 别名 + 排除 e2e/legacy) + setup(jest-dom + cleanup)
  - HelloMark 组件 TDD：先红后绿
  npm run test 通过；满足 spec §6.5 测试栈

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 5：Playwright 安装配置 + e2e smoke 测试（先红后绿）

> 建立 e2e/验收测试栈（§6.6 验收清单将用它跑端到端）。本 Task 用一个最小 e2e smoke：访问 `/` 断言标题——先在标题不对时红，改对后绿。走「执行 + 明确验证（e2e 通过）」。

**Files:**
- Create：`C:/Users/david/haoqi-online/playwright.config.ts`
- Test：`C:/Users/david/haoqi-online/e2e/smoke.spec.ts`

**Steps:**

- [ ] 从 `main` 切分支：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b chore/playwright-setup
  ```

- [ ] 安装 Playwright 浏览器（依赖已在 `package.json`，需下载 chromium）：
  ```bash
  cd /c/Users/david/haoqi-online && npx playwright install chromium
  ```
  期望：下载并安装 Chromium 成功（首次会拉二进制）。

- [ ] 写 `playwright.config.ts`（启动 dev server、基址 localhost:3000、仅 chromium、产物进被忽略目录）：
  ```ts
  import { defineConfig, devices } from "@playwright/test";

  export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: [["html", { open: "never" }]],
    use: {
      baseURL: "http://localhost:3000",
      trace: "on-first-retry",
    },
    projects: [
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
      },
    ],
    webServer: {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  });
  ```

- [ ] **先写会失败的 e2e**（故意断言一个错误标题，验证 e2e 真的在跑被测页面 → 红）`e2e/smoke.spec.ts`：
  ```ts
  import { test, expect } from "@playwright/test";

  test("首页可访问且标题正确", async ({ page }) => {
    await page.goto("/");
    // 故意先写错的断言（应失败），确认 e2e 真连到页面：
    await expect(page).toHaveTitle("WRONG TITLE ON PURPOSE");
  });
  ```

- [ ] **跑 e2e 看它失败**：
  ```bash
  cd /c/Users/david/haoqi-online && npm run test:e2e
  ```
  期望：1 个测试失败，报 `Expected: "WRONG TITLE ON PURPOSE"` vs 实际 `好奇 Online`（红，证明 e2e 已正确加载首页）。

- [ ] **改成正确断言**（转绿）。把 `smoke.spec.ts` 改为：
  ```ts
  import { test, expect } from "@playwright/test";

  test("首页可访问且标题正确", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("好奇 Online");
    await expect(
      page.getByRole("heading", { name: "好奇 Online" }),
    ).toBeVisible();
  });
  ```

- [ ] **再跑 e2e 看通过**：
  ```bash
  cd /c/Users/david/haoqi-online && npm run test:e2e
  ```
  期望：`1 passed`（绿）。

- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add -A
  git commit -m "test: Playwright e2e 栈 + 首页 smoke 测试

  - playwright.config.ts(自启 dev server + chromium + html report)
  - e2e/smoke.spec.ts TDD 先红后绿
  npm run test:e2e 通过；满足 spec §6.6 验收载体

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 6：Supabase CLI 初始化 + `config.toml` + 本地 `supabase start`（满足 §6.3 / §6.4 本地数据库）

> 建立本地 Supabase（本地 Postgres + Studio），把建表/RLS/seed 的版本化目录骨架立起来（具体迁移 SQL 在后续阶段写）。走执行 + 明确验证（`supabase start` 起得来、能连本地库）。**前置：本机需有 Docker Desktop 运行**（Supabase 本地栈依赖 Docker；若未装，记入阻塞并先跳过 start 验证，但 `init` 与目录骨架照建）。

**Files:**
- Create（由 `supabase init` 生成）：`C:/Users/david/haoqi-online/supabase/config.toml`
- Create：`C:/Users/david/haoqi-online/supabase/migrations/.gitkeep`
- Create：`C:/Users/david/haoqi-online/supabase/seed.sql`
- Modify：`C:/Users/david/haoqi-online/supabase/config.toml`（确认 seed 路径、本地端口）

**Steps:**

- [ ] 从 `main` 切分支：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b chore/supabase-init
  ```

- [ ] 初始化 Supabase（非交互；生成 `supabase/config.toml` 与 `.gitignore` 条目）：
  ```bash
  cd /c/Users/david/haoqi-online && npx supabase init
  ```
  期望：生成 `supabase/config.toml`、`supabase/.gitignore`（忽略本地临时态如 `.branches/`、`.temp/`）；输出 `Finished supabase init`。若提示已存在则跳过。

- [ ] 确认/编辑 `supabase/config.toml` 关键项：项目 id 设 `haoqi-online`，启用 `seed.sql`。用 Read 打开后，确保 `[db.seed]` 段存在且开启（新版 CLI 默认 seed 路径为 `./seed.sql`）。若缺失则补：
  ```toml
  [db.seed]
  enabled = true
  sql_paths = ["./seed.sql"]
  ```
  并确认 `[api]` `[db]` `[studio]` 端口为默认（54321 / 54322 / 54323），不改端口避免与文档/README 不一致。

- [ ] 建迁移目录占位与 seed 骨架（具体表 SQL 后续阶段填）。`supabase/migrations/.gitkeep` 写空文件；`supabase/seed.sql` 写带 §6.1 要求清单的注释骨架（**不写具体 INSERT，留给数据阶段**，但写清必须覆盖的内容，避免后续遗漏）：
  ```sql
  -- supabase/seed.sql
  -- 本切片演示数据（按 spec §6.1 / §1.5 / §6.6）。
  -- 具体 INSERT 由「数据模型 + seed」阶段填写，本文件先建骨架与必填清单，确保不遗漏：
  --
  -- 必须覆盖（支撑 §6.6 全部验收路径）：
  --   1. Term：至少 1 个 is_active=true 的当前学期（时区 Asia/Shanghai 推算第 N 周）。
  --   2. Course：若干门课（含 short_name / avatar_url / description / owner_id）。
  --   3. roster：约 40 名学生 + 若干老师名单（email lower(trim())、role、course_short_names、course_role）。
  --   4. CourseMembership：把 roster 的人分进课（member/teacher/assistant）。
  --   5. ScheduleSlot：当前学期各课时段（含 required / large_elective / small_elective / free）。
  --   6. ScheduleChange：至少 1 条（含一条 cancelled、一条 location 或 time），验调课横幅/标红。
  --   7. Post：每门课若干条 status='published' + 至少 1 条 status='draft'（验草稿可见性）。
  --   8. PostAsset：指向已手动放入 Storage bucket `post-assets` 的图（storage_key/asset_type='image'/sort_order）。
  --   9. Comment：可选预置若干，验真实计数 💬 n。
  --
  -- 注意：profiles 由「auth.users insert → 据 roster 建 profile」触发器生成，seed 不直接插 profiles
  --       （profiles.id 必须 = 真实 auth.users.id，见 spec §5.2）。
  ```

- [ ] 启动本地栈并验证（需 Docker 运行）：
  ```bash
  cd /c/Users/david/haoqi-online && npx supabase start
  ```
  期望：输出本地 `API URL: http://127.0.0.1:54321`、`Studio URL: http://127.0.0.1:54323`、`DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres`、以及 `anon key` / `service_role key`（这些是本地固定 demo key，可写进 `.env.local`）。
  > **阻塞兜底：** 若本机无 Docker / `supabase start` 报「Cannot connect to the Docker daemon」，则记入阻塞、提示安装 Docker Desktop，**本 Task 的目录骨架与 `init` 仍照常提交**；start 验证留待 Docker 就绪后补跑。不要伪造 start 成功。

- [ ] 验证本地库可连（Studio 探活）：
  ```bash
  cd /c/Users/david/haoqi-online && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:54323/ ; echo " <- Studio expect 200/307"
  ```
  期望：`200` 或 `307`（Studio 起来）。验证后可 `npx supabase stop` 收工（不必长开）。

- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add -A
  git commit -m "chore: Supabase CLI 初始化 + 本地栈配置 + migrations/seed 骨架

  - supabase init 生成 config.toml；启用 seed.sql
  - migrations/.gitkeep + seed.sql 写必填清单骨架（具体 INSERT 留数据阶段）
  - 本地 supabase start 验证（Postgres+Studio）
  满足 spec §6.3 / §6.4 本地数据库

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 7：三个 Supabase 客户端骨架 `lib/supabase/{client,server,admin}.ts`（满足 §4.3 命名与安全约定）

> 严格按共享背景 + §4.3 的**统一命名与导出**：`client.ts → createClient()`（browser）、`server.ts → createClient()`（cookies）、`admin.ts → createAdminClient()`（service-role + `import 'server-only'`）。本 Task 写客户端骨架 + 一个 TDD 测试断言 `admin.ts` 含 `server-only` 守卫与正确导出形态。

**Files:**
- Create：`C:/Users/david/haoqi-online/src/lib/supabase/client.ts`
- Create：`C:/Users/david/haoqi-online/src/lib/supabase/server.ts`
- Create：`C:/Users/david/haoqi-online/src/lib/supabase/admin.ts`
- Test：`C:/Users/david/haoqi-online/src/lib/supabase/admin.test.ts`

**Steps:**

- [ ] 从 `main` 切分支：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b feat/supabase-clients
  ```

- [ ] 写浏览器客户端 `src/lib/supabase/client.ts`（`@supabase/ssr` 的 `createBrowserClient`，只用 `NEXT_PUBLIC_` 变量）：
  ```ts
  import { createBrowserClient } from "@supabase/ssr";

  export function createClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  ```

- [ ] 写服务端客户端 `src/lib/supabase/server.ts`（基于 cookies；适配 Next 15 异步 `cookies()`；写 cookie 在 Server Component 中可能抛错，按官方模式 try/catch 吞掉，交给 middleware 刷新）：
  ```ts
  import { createServerClient } from "@supabase/ssr";
  import { cookies } from "next/headers";

  export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set(name, value, options);
              }
            } catch {
              // 在 Server Component 中 set cookie 会抛错；session 刷新交给 middleware.ts。
              // 此处吞掉即可，符合 @supabase/ssr 官方模式。
            }
          },
        },
      },
    );
  }
  ```

- [ ] 写 service-role 客户端 `src/lib/supabase/admin.ts`（顶部 `import 'server-only'`；用 `SUPABASE_SERVICE_ROLE_KEY`，**绝无 `NEXT_PUBLIC_`**；禁持久化 session）：
  ```ts
  import "server-only";
  import { createClient as createSupabaseClient } from "@supabase/supabase-js";

  /**
   * service-role 客户端：绕过 RLS，仅用于服务端管理操作（如花名册预置、跨用户管理）。
   * 安全红线（spec §4.3）：
   *  - 顶部 import "server-only" → 被任何 Client Component 引用时构建期报错。
   *  - 只读 SUPABASE_SERVICE_ROLE_KEY（绝不带 NEXT_PUBLIC_ 前缀）。
   *  - 默认不用本客户端；95% 取数/写入走 server.ts 让 RLS 判权。
   */
  export function createAdminClient() {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  ```

- [ ] **先写测试** `src/lib/supabase/admin.test.ts`（断言源码含 `server-only` 守卫、导出 `createAdminClient`、且**绝不**用 `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` 这种会泄露的命名——把安全约定钉成测试。读源码字符串断言，避免在 jsdom 里真实例化客户端）：
  ```ts
  import { readFileSync } from "node:fs";
  import { fileURLToPath } from "node:url";
  import { describe, it, expect } from "vitest";

  const adminSrc = readFileSync(
    fileURLToPath(new URL("./admin.ts", import.meta.url)),
    "utf8",
  );

  describe("admin.ts service-role 客户端安全约定", () => {
    it("顶部 import 'server-only' 守卫存在", () => {
      expect(adminSrc).toMatch(/import\s+["']server-only["']/);
    });

    it("导出 createAdminClient", () => {
      expect(adminSrc).toMatch(/export\s+function\s+createAdminClient/);
    });

    it("用 SUPABASE_SERVICE_ROLE_KEY 且绝不带 NEXT_PUBLIC_ 前缀", () => {
      expect(adminSrc).toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
      expect(adminSrc).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
    });
  });
  ```

- [ ] **跑测试看它失败**（此时 `admin.ts` 已写好，但若先按 TDD 严格——可先临时把 `import "server-only"` 注释掉跑一次看红，再恢复）：
  ```bash
  cd /c/Users/david/haoqi-online && npm run test -- src/lib/supabase/admin.test.ts
  ```
  期望：在 `admin.ts` 完整时 3 项全绿；若想看红，临时删 `import "server-only"` 行重跑，第 1 项失败，恢复后再绿。

- [ ] 让测试通过（确保 `admin.ts` 三项都满足）后整跑单测：
  ```bash
  cd /c/Users/david/haoqi-online && npm run test
  ```
  期望：所有测试通过（含 Task 4 的 HelloMark）。

- [ ] 验证 build 通过 + `server-only` 守卫不破坏构建（这三个客户端尚未被任何页面 import，build 应正常）：
  ```bash
  cd /c/Users/david/haoqi-online && npm run build && npm run lint
  ```
  期望：build `✓ Compiled successfully`；lint 退出 0（注意：这三个文件本身不 import `admin`，不会触发 Task 3 的 `no-restricted-imports`）。

- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add -A
  git commit -m "feat: 三个 Supabase 客户端骨架 client/server/admin

  - client.ts createClient()(browser, @supabase/ssr)
  - server.ts createClient()(cookies, Next15 异步 cookies + 官方 setAll 吞错)
  - admin.ts createAdminClient()(service-role + import 'server-only')
  - admin.test.ts 把 server-only/导出名/无 NEXT_PUBLIC_ 钉成测试
  满足 spec §4.3 客户端命名与安全约定

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 8：`.env.example` + 环境变量管理 + Vercel 部署说明（满足 §6.3 / §4.3 环境变量边界）

> 把环境变量边界落成可提交的 `.env.example`（占位值）+ 部署文档；`.env.local`（真值）已被现有 `.gitignore` 的 `.env.*` + `!.env.example` 规则正确处理（已核对）。走执行 + 明确验证（占位变量名与 §6.3 完全一致、`.env.local` 确实被忽略）。

**Files:**
- Create：`C:/Users/david/haoqi-online/.env.example`
- Create：`C:/Users/david/haoqi-online/docs/DEPLOY.md`

**Steps:**

- [ ] 从 `main` 切分支：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b chore/env-and-deploy-docs
  ```

- [ ] 写 `.env.example`（变量名与 §6.3 / §4.3 **逐字一致**，占位值可提交；service-role 明确注释绝不带 `NEXT_PUBLIC_`）：
  ```bash
  # 好奇 Online 环境变量（占位值，可提交；真值放 .env.local，git 忽略，绝不提交）
  # 本地值由 `npx supabase start` 输出；线上值在 Supabase 项目 Settings → API 取，配进 Vercel 环境变量。

  # 下发浏览器（NEXT_PUBLIC_ 前缀）——安全靠 RLS 兜底
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key

  # 仅服务端，绝不暴露浏览器，绝不带 NEXT_PUBLIC_ 前缀；一旦带前缀立即在 Supabase 后台 rotate
  SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
  ```

- [ ] 写 `docs/DEPLOY.md`（Vercel + Supabase 部署说明，吸收 §6.3）：
  ```markdown
  # 部署说明（Vercel + Supabase）

  > 依据 spec §6.3 / §4.3。约 40 名学生 + 老师并行 vibe coding，请逐条照做。

  ## 1. 环境变量（三个，命名即权限边界）

  | 变量 | 下发浏览器？ | 用途 | 来源 |
  | --- | --- | --- | --- |
  | `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase 项目 API 地址 | Supabase → Settings → API |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是（安全靠 RLS） | 浏览器/服务端 anon 客户端 | 同上 |
  | `SUPABASE_SERVICE_ROLE_KEY` | **否，绝不** | 服务端管理操作（绕 RLS） | 同上 |

  - 本地：`Copy-Item .env.example .env.local`，填 `npx supabase start` 输出的本地 key。
  - `.env.local` 已被 `.gitignore` 忽略，**绝不提交**；真密钥不发群、不截图。
  - `SUPABASE_SERVICE_ROLE_KEY` 一旦误带 `NEXT_PUBLIC_` 前缀或进了客户端 bundle → 立即在 Supabase 后台 **rotate**。
  - 机器化卡点：`npm run build && npm run check:secrets` 会扫客户端 bundle，命中 service-role 即失败（CI 必跑）。

  ## 2. Supabase 云项目

  - 起步至少给 `main` 一个独立云 project；开发用本地（`supabase start`）或第二个 free project，避免脏数据污染线上。
  - 建表 + RLS + 触发器 + Storage policy + 种子**全部走 `supabase/migrations/` SQL 版本化提交**，不在网页后台点鼠标改表。
  - 把本地 migrations 推到云：`npx supabase link --project-ref <ref>` 后 `npx supabase db push`。

  ## 3. Vercel

  - GitHub 直连 `xing0325/haoqi-online-new`。
  - **Production 分支 = `main`**（合进自动发线上）；每个 PR 自动 **Preview 部署**，审批人点 PR 里 preview 链接验真效果。
  - **Root Directory = 仓库根**（Next 应用就在根，框架自动识别）。
  - 环境变量在 Vercel → Settings → Environment Variables 分 Production / Preview 分别填（Preview 可指向开发用 Supabase project）。
  - 未经负责人确认，**不加**任何收费 / 支付 / 第三方统计追踪脚本 / 额外认证供应商。

  ## 4. 部署前自查（合并门槛，§6.5）

  - [ ] `npm run build` 通过
  - [ ] `npm run lint` 通过
  - [ ] `npm run test` 通过
  - [ ] `npm run build && npm run check:secrets` 通过（service-role 不进客户端）
  - [ ] 窄屏不横向溢出、图标钮有 aria-label
  ```

- [ ] 验证 `.env.local` 确实被忽略、`.env.example` 不被忽略（防止真密钥误入 git）：
  ```bash
  cd /c/Users/david/haoqi-online
  printf "SECRET=should-be-ignored\n" > .env.local
  git check-ignore .env.example .env.local ; echo "--- (只应列出 .env.local) ---"
  git status --porcelain | grep -E "\.env" || echo "git 未追踪任何 .env.local（正确）"
  rm -f .env.local
  ```
  期望：`git check-ignore` 只输出 `.env.local`（`.env.example` 未被忽略 → 不在输出里）；`git status` 不显示 `.env.local`。

- [ ] 验证 `.env.example` 变量名与 §6.3 完全一致（无 typo、service-role 无 `NEXT_PUBLIC_`）：
  ```bash
  cd /c/Users/david/haoqi-online && grep -E "^NEXT_PUBLIC_SUPABASE_URL=|^NEXT_PUBLIC_SUPABASE_ANON_KEY=|^SUPABASE_SERVICE_ROLE_KEY=" .env.example | wc -l && echo "expect 3" && grep -c "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" .env.example && echo "expect 0 (service-role 无 NEXT_PUBLIC_)"
  ```
  期望：第一段输出 `3`；第二段输出 `0`。

- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add -A
  git commit -m "chore: .env.example + Vercel/Supabase 部署说明

  - .env.example 三变量逐字对齐 §6.3；service-role 注释绝不带 NEXT_PUBLIC_
  - docs/DEPLOY.md 环境变量边界 + Supabase 云 + Vercel + 部署前自查
  - 验证 .env.local 被忽略、.env.example 可提交
  满足 spec §6.3 / §4.3 环境变量边界

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 9：阶段 0 收口验证——一条命令跑通全门槛（满足 §6.5 全部）

> 把 §6.5 质量门槛串成一次性可复现验证，作为阶段 0「算做完」的证据；并确认 8 个 Task 的产物协同无冲突。走执行 + 明确验证。

**Files:**
- Create：`C:/Users/david/haoqi-online/docs/PHASE0_CHECK.md`（记录验证命令与期望输出，供整合者复跑）

**Steps:**

- [ ] 从 `main` 切分支（前置：Task 1–8 已合并到 main；若整合者把阶段 0 合在一个分支，则在该分支上做）：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b chore/phase0-verify
  ```

- [ ] 全门槛串跑（任一非零退出即阶段 0 未完成）：
  ```bash
  cd /c/Users/david/haoqi-online && npm install && npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build && npm run check:secrets && npm run test:e2e
  ```
  期望：每一步退出 0；`test` 报全部通过；`build` `✓ Compiled successfully`；`check:secrets` 打印「通过：客户端 bundle 未发现 service-role 密钥」；`test:e2e` `1 passed`。

- [ ] 写 `docs/PHASE0_CHECK.md` 记录这条验证链与每步期望（供后续阶段/整合者复跑；不写占位，写真实命令）：
  ```markdown
  # 阶段 0 收口验证

  在仓库根按顺序执行，任一步非零退出即阶段 0 未完成：

  | 步骤 | 命令 | 期望 |
  | --- | --- | --- |
  | 装依赖 | `npm install` | 退出 0 |
  | Lint | `npm run lint` | 无 ESLint 错误，退出 0 |
  | 格式 | `npm run format:check` | Prettier 全通过 |
  | 类型 | `npm run typecheck` | `tsc --noEmit` 严格模式无错 |
  | 单测 | `npm run test` | Vitest 全部通过（含 HelloMark、admin 安全约定） |
  | 构建 | `npm run build` | `✓ Compiled successfully` |
  | 密钥卡点 | `npm run check:secrets` | 「通过：客户端 bundle 未发现 service-role 密钥」 |
  | e2e | `npm run test:e2e` | 首页 smoke `1 passed` |

  本地数据库（需 Docker）：
  | 命令 | 期望 |
  | --- | --- |
  | `npx supabase start` | 输出本地 API/Studio/DB URL 与本地 anon/service_role key |
  | `npx supabase stop` | 干净收工 |

  一条命令串跑：
  ```bash
  npm install && npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build && npm run check:secrets && npm run test:e2e
  ```
  ```

- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add -A
  git commit -m "chore: 阶段 0 收口验证清单 + 全门槛串跑

  - docs/PHASE0_CHECK.md 记录 lint/format/typecheck/test/build/check:secrets/e2e 链
  - 全链本地跑通，作为阶段 0 完成证据
  满足 spec §6.5 全部质量门槛

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

> **阶段 0 完成定义（DoD）：** Task 1–9 全部 commit；`npm install && npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build && npm run check:secrets && npm run test:e2e` 一次性全绿；`npx supabase start` 能起本地 Postgres+Studio（Docker 就绪时）；原型在 `legacy-prototype/` 只读；三个客户端骨架命名与 §4.3 一致且 `admin.ts` 有 `server-only` 守卫；`.env.example` 变量名逐字对齐 §6.3、`.env.local` 被忽略。此后各空间 vibe-coder 可在 `src/app/(shell)/<自己空间>/` 平行开工。
>
> **给整合者的两处提示（spec 内部小张力，已按权威节裁决）：**
> 1. **`src/` 归属：** §6.1 明确「Next 应用建在仓库根、源码在 `src/`」，§4.1 目录树未画 `src/` 前缀。本阶段以 **§6.1 为准**，所有源码落 `src/app` `src/components` `src/lib`，`tsconfig` 的 `@/*` 指向 `src/*`。后续阶段写页面时路径同此。
> 2. **`next lint` 与 flat config：** 用了 ESLint flat config（`eslint.config.mjs`）+ `@eslint/eslintrc` 桥接 `next/core-web-vitals`；Next 15 支持。若整合时 `next lint` 行为有变，可改为直接 `eslint .` 作为 `lint` 脚本，门槛语义不变。

相关文件（绝对路径）：
- 设计 spec（唯一事实来源）：`C:/Users/david/haoqi-online/docs/specs/2026-06-21-haoqi-online-first-slice-design.md`
- 迁移目标：`C:/Users/david/haoqi-online/legacy-prototype/`（当前原型仍在仓库根 `index.html` 等）
- 远端：`https://github.com/xing0325/haoqi-online-new.git`（默认 `main`，远端名不改）

---

## 阶段 1：设计系统移植 + 应用外壳 + 5 个占位页

> **本阶段范围与依赖说明（执行者必读）**
> - 依据 spec 小节：§2.0（页面地图与路由）、§2.4（5 个占位空间 + 顶栏全局钮诚实处理）、§2.5（跨屏一致交互与可达性）、§4.1（目录结构）、§4.5（设计系统移植策略），并对照原型 `legacy-prototype/styles.css`（`:root` token + `.app-shell/.sidebar/.topbar`）与 `legacy-prototype/index.html`（外壳 DOM）。
> - **前置假设**：阶段 0 已完成 Next.js(App Router)+TypeScript 脚手架、`package.json`（含 `dev/build/lint/test/test:e2e` 脚本）、`tsconfig.json`、Vitest + `@testing-library/react` + jsdom 配置、Playwright 配置（`playwright.config.ts`，`webServer` 指向 `npm run build && npm run start` 或 `npm run dev`，`baseURL=http://localhost:3000`）、`lib/supabase/{client,server,admin}.ts`、`legacy-prototype/` 迁移（§6.0）。**本阶段不重复搭建这些**；若执行到某 step 发现缺失，停下回阶段 0。
> - **目录约定**：采用 spec §4.1 与共享背景的**根级**布局（`app/`、`components/`、`lib/` 直接在仓库根，不加 `src/` 前缀）。
> - 本阶段**不接任何真数据**：`/`（此刻）与 `/courses` 在本阶段只做"挂载在外壳里、能路由、有标题占位骨架"，真数据由后续阶段接入。本阶段 5 个 `(placeholders)` 页是诚实"建设中"占位。
> - 满足的验收（§6.6）：**F. 视觉不回归**（全部 3 条）、**E. 诚实占位**第 1 条（5 入口都在 + 点进去明确"建设中"）与第 4 条（顶栏搜索/通知禁用无假红点、＋发起一件事不弹假表单）、**G. 路由与可恢复性**第 1 条（前进后退/刷新在外壳内不白屏）。守护不变量：**外壳视觉不回归**、**诚实纪律**（不放假按钮/假红点/假表单）。

---

### Task 1：移植全局设计 token + 基础排版到 `app/globals.css`

**目标**：把原型 `legacy-prototype/styles.css` 的 `:root` 语义变量（`--ink/--navy/--paper/--white/--line/--yellow/--lemon/--blue/--coral/--mint/--pink/--radius` 等）原样搬进 `app/globals.css`，加 reset + `body/button/a` 基础，不改色值不改语义。满足 §4.5 第 1 条与验收 F（纸感/海军蓝/语义色）。

**Files:**
- Create: `app/globals.css`
- Test: `tests/unit/globals-tokens.test.ts`

**Steps:**

- [ ] 写失败测试 `tests/unit/globals-tokens.test.ts`，断言 `app/globals.css` 文本含全部语义 token 与正确色值（此时文件不存在，测试失败）：

```ts
// tests/unit/globals-tokens.test.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const css = (() => {
  try {
    return readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
  } catch {
    return "";
  }
})();

describe("globals.css 设计 token 忠实移植", () => {
  const tokens: Record<string, string> = {
    "--ink": "#18243b",
    "--ink-soft": "#5d6a7e",
    "--paper": "#f6f5f0",
    "--white": "#fffefa",
    "--line": "#e8e6de",
    "--yellow": "#ffe55b",
    "--lemon": "#fff4a9",
    "--blue": "#c9defd",
    "--coral": "#ffc6b5",
    "--mint": "#c7f0d6",
    "--navy": "#192943",
    "--pink": "#ffa9b7",
    "--radius": "20px",
  };

  it.each(Object.entries(tokens))("定义 %s = %s", (name, value) => {
    const re = new RegExp(`${name}\\s*:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*;`);
    expect(css).toMatch(re);
  });

  it("含 box-sizing reset 与 body 纸感背景", () => {
    expect(css).toMatch(/\*\s*\{\s*box-sizing:\s*border-box;\s*\}/);
    expect(css).toMatch(/background:\s*var\(--paper\)/);
    expect(css).toMatch(/color:\s*var\(--ink\)/);
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- tests/unit/globals-tokens.test.ts`（应报红：找不到文件/token）。

- [ ] 写最小实现 `app/globals.css`（从原型 `styles.css` 第 1–22 行整块搬运 `:root` + reset + base，不改色值；模块级样式不进此文件）：

```css
/* app/globals.css — 全局设计 token + reset（忠实移植自 legacy-prototype/styles.css :root）
   规则（spec §4.5）：只放颜色/圆角/字体变量、box-sizing、body、button/a 基础。
   组件样式一律写各自 CSS Module，颜色引用这里的变量，不写死十六进制。 */
:root {
  --ink: #18243b;
  --ink-soft: #5d6a7e;
  --paper: #f6f5f0;
  --white: #fffefa;
  --line: #e8e6de;
  --yellow: #ffe55b;
  --lemon: #fff4a9;
  --blue: #c9defd;
  --coral: #ffc6b5;
  --mint: #c7f0d6;
  --navy: #192943;
  --pink: #ffa9b7;
  --radius: 20px;
  font-synthesis: none;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Microsoft YaHei UI", "PingFang SC", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

button,
a {
  font: inherit;
}

button {
  color: inherit;
  cursor: pointer;
}
```

- [ ] 跑测试看通过：`npm run test -- tests/unit/globals-tokens.test.ts`（应全绿）。

- [ ] commit：

```bash
git add app/globals.css tests/unit/globals-tokens.test.ts
git commit -m "$(cat <<'EOF'
feat(shell): 移植原型设计 token 到 app/globals.css

满足 spec §4.5 第1条 / 验收 F；token 色值与 legacy-prototype 完全一致。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2：Avatar 原子组件（CSS Module）

**目标**：移植原型 `.avatar` 及四个色变体（`avatar-pink/yellow/blue/mint`），头像 `avatar_url` 为空时用名字首字渲染色块（spec §5.2「空时前端用名字首字渲染色块」）。后续侧栏、占位页、动态卡复用。走 TDD。

**Files:**
- Create: `components/ui/Avatar.tsx`
- Create: `components/ui/Avatar.module.css`
- Test: `tests/unit/Avatar.test.tsx`

**Steps:**

- [ ] 写失败测试 `tests/unit/Avatar.test.tsx`：

```tsx
// tests/unit/Avatar.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar } from "@/components/ui/Avatar";

describe("Avatar", () => {
  it("无 src 时渲染名字首字符作为占位", () => {
    render(<Avatar name="林元" />);
    expect(screen.getByText("林")).toBeInTheDocument();
  });

  it("无 src 时是图片占位，带 aria-label 含名字", () => {
    render(<Avatar name="思齐" />);
    const el = screen.getByLabelText("思齐");
    expect(el).toBeInTheDocument();
  });

  it("有 src 时渲染 img，alt = 名字", () => {
    render(<Avatar name="David" src="https://example.com/a.png" />);
    const img = screen.getByRole("img", { name: "David" });
    expect(img).toHaveAttribute("src", "https://example.com/a.png");
  });

  it("接受 tone 颜色变体 class", () => {
    const { container } = render(<Avatar name="岳岳" tone="mint" />);
    expect(container.firstElementChild?.className).toMatch(/mint/);
  });
});
```

- [ ] 跑测试看失败：`npm run test -- tests/unit/Avatar.test.tsx`。

- [ ] 写实现 `components/ui/Avatar.module.css`（移植原型 `.avatar` 与色变体，颜色引用全局变量）：

```css
/* components/ui/Avatar.module.css — 移植自 legacy-prototype/styles.css .avatar */
.avatar {
  flex: 0 0 auto;
  width: 29px;
  height: 29px;
  display: inline-grid;
  place-items: center;
  border: 2px solid var(--white);
  border-radius: 50%;
  font-size: 10px;
  color: var(--ink);
  font-weight: 800;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pink {
  background: var(--pink);
}
.yellow {
  background: var(--yellow);
}
.blue {
  background: var(--blue);
}
.mint {
  background: var(--mint);
}
```

- [ ] 写实现 `components/ui/Avatar.tsx`：

```tsx
// components/ui/Avatar.tsx
import styles from "./Avatar.module.css";

export type AvatarTone = "pink" | "yellow" | "blue" | "mint";

export function Avatar({
  name,
  src,
  tone = "pink",
}: {
  name: string;
  src?: string | null;
  tone?: AvatarTone;
}) {
  const initial = name.trim().charAt(0) || "·";
  const className = `${styles.avatar} ${styles[tone]}`;

  if (src) {
    return (
      <span className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} role="img" />
      </span>
    );
  }

  return (
    <span className={className} role="img" aria-label={name}>
      {initial}
    </span>
  );
}
```

- [ ] 跑测试看通过：`npm run test -- tests/unit/Avatar.test.tsx`。

- [ ] commit：

```bash
git add components/ui/Avatar.tsx components/ui/Avatar.module.css tests/unit/Avatar.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): Avatar 组件（移植原型 .avatar，空头像用首字色块）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3：导航数据源 + Sidebar 服务端结构（7 入口）

**目标**：定义 7 个导航入口的单一数据源（`components/shell/nav-items.ts`），并实现 Sidebar 的纯结构（brand + 7 nav-item + 集体好奇心卡 + 个人按钮占位），移植原型 `.sidebar` 视觉。**active 高亮**与**窄屏开合**在后续 Task（4、6）做 Client 包装；本 Task 先把可服务端渲染的结构 + 样式立起来。满足 §2.0 七空间脚注、§2.4「我的一周纯占位」。

**Files:**
- Create: `components/shell/nav-items.ts`
- Create: `components/shell/Sidebar.tsx`
- Create: `components/shell/Sidebar.module.css`
- Test: `tests/unit/nav-items.test.ts`
- Test: `tests/unit/Sidebar.test.tsx`

**Steps:**

- [ ] 写失败测试 `tests/unit/nav-items.test.ts`（锁定 7 入口与路由，防漏项/改色语义）：

```ts
// tests/unit/nav-items.test.ts
import { describe, it, expect } from "vitest";
import { NAV_ITEMS } from "@/components/shell/nav-items";

describe("NAV_ITEMS 七空间入口", () => {
  it("恰好 7 个入口", () => {
    expect(NAV_ITEMS).toHaveLength(7);
  });

  it("href 与 label 与原型一致、顺序一致", () => {
    expect(NAV_ITEMS.map((i) => [i.href, i.label])).toEqual([
      ["/", "此刻"],
      ["/courses", "课程"],
      ["/my-week", "我的一周"],
      ["/credits", "信用积分"],
      ["/reading", "阅读联赛"],
      ["/projects", "做事空间"],
      ["/community", "大家在干嘛"],
    ]);
  });

  it("只有 此刻 / 课程 标记为真数据，其余为占位", () => {
    const real = NAV_ITEMS.filter((i) => i.real).map((i) => i.href);
    expect(real).toEqual(["/", "/courses"]);
  });

  it("每个入口都有 icon 符号", () => {
    for (const i of NAV_ITEMS) expect(i.icon).toBeTruthy();
  });
});
```

- [ ] 跑测试看失败：`npm run test -- tests/unit/nav-items.test.ts`。

- [ ] 写实现 `components/shell/nav-items.ts`（icon 用原型同款符号字符）：

```ts
// components/shell/nav-items.ts
export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** true=本切片接真数据；false=诚实占位 */
  real: boolean;
};

// 顺序、文案、图标符号忠实移植 legacy-prototype/index.html .main-nav
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "此刻", icon: "⌂", real: true },
  { href: "/courses", label: "课程", icon: "◒", real: true },
  { href: "/my-week", label: "我的一周", icon: "▦", real: false },
  { href: "/credits", label: "信用积分", icon: "✳", real: false },
  { href: "/reading", label: "阅读联赛", icon: "⌁", real: false },
  { href: "/projects", label: "做事空间", icon: "◫", real: false },
  { href: "/community", label: "大家在干嘛", icon: "◎", real: false },
];
```

- [ ] 跑测试看通过：`npm run test -- tests/unit/nav-items.test.ts`。

- [ ] 写 `components/shell/Sidebar.module.css`（移植原型 `.sidebar/.brand/.brand-mark/.main-nav/.nav-item/.club-card/.meter/.profile`，保留 `brand-mark` 旋转等手工感）：

```css
/* components/shell/Sidebar.module.css — 移植自 legacy-prototype/styles.css */
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 30px 18px 20px;
  background: var(--navy);
  color: #f7f5ee;
  display: flex;
  flex-direction: column;
  z-index: 5;
}

.brand {
  padding: 0 10px;
  color: inherit;
  display: flex;
  gap: 10px;
  align-items: center;
  text-decoration: none;
  font-weight: 800;
  font-size: 19px;
  letter-spacing: -1px;
  line-height: 0.8;
}

.brandMark {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  border-radius: 12px 12px 3px 12px;
  background: var(--yellow);
  color: var(--navy);
  font-size: 21px;
  transform: rotate(-5deg);
}

.brand em {
  color: #a7b7cf;
  font-size: 8px;
  letter-spacing: 2.8px;
  font-style: normal;
  font-weight: 700;
}

.mainNav {
  margin-top: 48px;
  display: grid;
  gap: 5px;
}

.navItem {
  min-height: 48px;
  padding: 0 13px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #c1cada;
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
  transition: 0.2s ease;
}

.navItem .icon {
  width: 18px;
  color: #a6b3c6;
  font-size: 21px;
  line-height: 1;
  text-align: center;
}

.navItem:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.navItem.active {
  color: white;
  background: rgba(255, 255, 255, 0.13);
}

.navItem.active .icon {
  color: var(--yellow);
}

.sidebarBottom {
  margin-top: auto;
}

.clubCard {
  margin: 0 3px 15px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.04);
  position: relative;
  overflow: hidden;
}

.clubSpark {
  position: absolute;
  right: 11px;
  top: 8px;
  font-size: 24px;
  color: var(--yellow);
  transform: rotate(18deg);
}

.clubCard p {
  margin: 0 0 10px;
  color: #cbd3e0;
  font-size: 12px;
  line-height: 1.45;
}

.clubCard strong {
  color: white;
}

.meter {
  height: 5px;
  overflow: hidden;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
}

.meter i {
  display: block;
  width: 76%;
  height: 100%;
  background: var(--yellow);
  border-radius: inherit;
}

.profile {
  width: 100%;
  border: 0;
  padding: 9px 8px;
  background: none;
  color: white;
  display: flex;
  gap: 9px;
  align-items: center;
  text-align: left;
  font-weight: 700;
  font-size: 12px;
}

.profile small {
  display: block;
  margin-top: 3px;
  color: #9dabc0;
  font-weight: 500;
}

.profile b {
  margin-left: auto;
  color: #aab5c7;
  font-size: 15px;
}
```

- [ ] 写实现 `components/shell/Sidebar.tsx`（纯结构 Server Component；`activeHref` 由父传入，本 Task 默认 `/`；个人按钮显式标"演示身份 · 未接登录"，遵守 §5 诚实声明）：

```tsx
// components/shell/Sidebar.tsx
import Link from "next/link";
import { NAV_ITEMS } from "./nav-items";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./Sidebar.module.css";

export function Sidebar({
  activeHref,
  id,
  className,
}: {
  activeHref: string;
  id?: string;
  className?: string;
}) {
  return (
    <aside
      id={id}
      className={`${styles.sidebar} ${className ?? ""}`}
      aria-label="主导航"
    >
      <Link className={styles.brand} href="/" aria-label="好奇 Online 首页">
        <span className={styles.brandMark}>好</span>
        <span>
          好奇
          <br />
          <em>ONLINE</em>
        </span>
      </Link>

      <nav className={styles.mainNav}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? activeHref === "/"
              : activeHref.startsWith(item.href);
          return (
            <Link
              key={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={styles.icon} aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.clubCard}>
          <span className={styles.clubSpark} aria-hidden="true">
            ✦
          </span>
          <p>
            本周的集体
            <br />
            好奇心 <strong>建设中</strong>
          </p>
          <div className={styles.meter}>
            <i />
          </div>
        </div>
        <button className={styles.profile} type="button" disabled>
          <Avatar name="演示" tone="pink" />
          <span>
            演示身份
            <small>未接登录 · 建设中</small>
          </span>
          <b aria-hidden="true">⌄</b>
        </button>
      </div>
    </aside>
  );
}
```

> 诚实说明：集体好奇心百分比、个人身份是 OUT/未接后端，故 `76%` 改"建设中"、个人按钮禁用并标"未接登录"，遵守 §2.5 与 §5 诚实声明；登录接通后由对应阶段替换。

- [ ] 写失败→通过测试 `tests/unit/Sidebar.test.tsx`：

```tsx
// tests/unit/Sidebar.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Sidebar } from "@/components/shell/Sidebar";

describe("Sidebar", () => {
  it("渲染 7 个导航链接", () => {
    render(<Sidebar activeHref="/" />);
    const nav = screen.getByRole("navigation", { name: "主导航" });
    expect(nav.querySelectorAll("a")).toHaveLength(7);
  });

  it("当前页链接带 aria-current=page", () => {
    render(<Sidebar activeHref="/courses" />);
    const current = screen.getByRole("link", { name: /课程/ });
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("根路径 / 只在精确匹配时 active（不被 /courses 误命中）", () => {
    render(<Sidebar activeHref="/courses" />);
    const home = screen.getByRole("link", { name: /此刻/ });
    expect(home).not.toHaveAttribute("aria-current", "page");
  });

  it("个人按钮诚实禁用并标未接登录", () => {
    render(<Sidebar activeHref="/" />);
    const profile = screen.getByRole("button", { name: /演示身份/ });
    expect(profile).toBeDisabled();
    expect(screen.getByText(/未接登录/)).toBeInTheDocument();
  });
});
```

- [ ] 跑测试看通过：`npm run test -- tests/unit/Sidebar.test.tsx`。

- [ ] commit：

```bash
git add components/shell/nav-items.ts components/shell/Sidebar.tsx components/shell/Sidebar.module.css tests/unit/nav-items.test.ts tests/unit/Sidebar.test.tsx
git commit -m "$(cat <<'EOF'
feat(shell): Sidebar 结构 + 7 入口导航数据源（移植原型 .sidebar）

7 空间入口齐全，仅 此刻/课程 标真数据；集体好奇心/个人身份诚实占位。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4：Topbar 组件（面包屑 + 搜索/通知禁用态 + ＋发起占位）

**目标**：移植原型 `.topbar`，实现 §2.4 顶栏三钮诚实处理：搜索/通知**禁用态**、**去掉 notification-dot 假红点**、"＋发起一件事"**不弹假表单**（本切片渲染为 `disabled` 并 `aria-label` 标"建设中"，不挂任何 onClick 表单）。面包屑由 props 注入。走 TDD。

**Files:**
- Create: `components/shell/Topbar.tsx`
- Create: `components/shell/Topbar.module.css`
- Test: `tests/unit/Topbar.test.tsx`

**Steps:**

- [ ] 写失败测试 `tests/unit/Topbar.test.tsx`：

```tsx
// tests/unit/Topbar.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Topbar } from "@/components/shell/Topbar";

describe("Topbar 顶栏诚实处理（spec §2.4）", () => {
  it("渲染面包屑 当前段", () => {
    render(<Topbar crumb="此刻" />);
    expect(screen.getByText("此刻")).toBeInTheDocument();
    expect(screen.getByText(/好奇学习社区/)).toBeInTheDocument();
  });

  it("搜索钮禁用并标建设中", () => {
    render(<Topbar crumb="此刻" />);
    const search = screen.getByRole("button", { name: /搜索（建设中）/ });
    expect(search).toBeDisabled();
  });

  it("通知钮禁用且无假红点（无 notification-dot class）", () => {
    render(<Topbar crumb="此刻" />);
    const bell = screen.getByRole("button", { name: /通知（建设中）/ });
    expect(bell).toBeDisabled();
    expect(bell.className).not.toMatch(/notificationDot|notification-dot/);
  });

  it("＋发起一件事 禁用、不挂表单触发", () => {
    render(<Topbar crumb="此刻" />);
    const create = screen.getByRole("button", { name: /发起一件事（建设中）/ });
    expect(create).toBeDisabled();
  });

  it("汉堡菜单钮存在并能接 onClick（窄屏用）", () => {
    render(<Topbar crumb="此刻" onMenuClick={() => {}} />);
    expect(screen.getByRole("button", { name: /打开导航/ })).toBeInTheDocument();
  });
});
```

- [ ] 跑测试看失败：`npm run test -- tests/unit/Topbar.test.tsx`。

- [ ] 写 `components/shell/Topbar.module.css`（移植 `.topbar/.crumb/.icon-button/.new-button/.mobile-menu`，**故意不移植 `.notification-dot`**，并加 `disabled` 视觉降权）：

```css
/* components/shell/Topbar.module.css — 移植自 legacy-prototype/styles.css，去掉 notification-dot */
.topbar {
  height: 84px;
  max-width: 1420px;
  padding: 0 clamp(25px, 4.2vw, 70px);
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.crumb {
  color: #8993a2;
  font-size: 12px;
  font-weight: 600;
}

.crumb span {
  color: var(--ink);
}

.topActions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.iconButton {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  background: none;
  border-radius: 50%;
  font-size: 21px;
}

.iconButton:hover:not(:disabled) {
  background: #eceae2;
}

.iconButton:disabled,
.newButton:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.newButton {
  border: 0;
  padding: 11px 16px;
  border-radius: 10px;
  background: var(--ink);
  color: white;
  font-size: 12px;
  font-weight: 750;
  box-shadow: 0 3px 0 rgba(20, 31, 50, 0.13);
  transition: transform 0.15s, box-shadow 0.15s;
}

.newButton span {
  margin-right: 4px;
  color: var(--yellow);
  font-size: 16px;
}

.newButton:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 0 rgba(20, 31, 50, 0.13);
}

.mobileMenu {
  display: none;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: #e9e8e1;
  font-size: 17px;
}
```

- [ ] 写实现 `components/shell/Topbar.tsx`（纯展示，三个全局钮 `disabled`；汉堡钮接 `onMenuClick`，由父 Client 壳传入；本组件不引 `"use client"`，靠不挂内部 state 保持可作叶子被 Client 父渲染）：

```tsx
// components/shell/Topbar.tsx
import styles from "./Topbar.module.css";

export function Topbar({
  crumb,
  onMenuClick,
}: {
  crumb: string;
  onMenuClick?: () => void;
}) {
  return (
    <header className={styles.topbar}>
      <button
        className={styles.mobileMenu}
        type="button"
        aria-label="打开导航"
        onClick={onMenuClick}
      >
        ☰
      </button>
      <div className={styles.crumb}>
        好奇学习社区 / <span>{crumb}</span>
      </div>
      <div className={styles.topActions}>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="搜索（建设中）"
          title="全局搜索建设中"
          disabled
        >
          ⌕
        </button>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="通知（建设中）"
          title="通知中心建设中"
          disabled
        >
          ♧
        </button>
        <button
          className={styles.newButton}
          type="button"
          aria-label="发起一件事（建设中）"
          title="发起功能建设中"
          disabled
        >
          <span aria-hidden="true">＋</span> 发起一件事
        </button>
      </div>
    </header>
  );
}
```

> 诚实说明：三钮全 `disabled` + `aria-label` 标"建设中"，**未渲染 notification-dot 假红点**，"＋发起一件事"**未挂任何 modal/表单**，满足 §2.4 与验收 E 第 4 条。

- [ ] 跑测试看通过：`npm run test -- tests/unit/Topbar.test.tsx`。

- [ ] commit：

```bash
git add components/shell/Topbar.tsx components/shell/Topbar.module.css tests/unit/Topbar.test.tsx
git commit -m "$(cat <<'EOF'
feat(shell): Topbar（搜索/通知禁用、去假红点、＋发起不弹假表单）

满足 spec §2.4 / 验收 E 第4条：顶栏三钮诚实禁用，无 notification-dot。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5：诚实占位组件 `PlaceholderView`（5 个空间复用）

**目标**：一个统一的"建设中"占位组件（移植原型 `.placeholder-view` 排版），明确自报"建设中 · 未接后端 · 示例仅供感受"，**不放任何会触发假写入的按钮**。满足 §2.4、验收 E 第 1 条。走 TDD。

**Files:**
- Create: `components/ui/PlaceholderView.tsx`
- Create: `components/ui/PlaceholderView.module.css`
- Test: `tests/unit/PlaceholderView.test.tsx`

**Steps:**

- [ ] 写失败测试 `tests/unit/PlaceholderView.test.tsx`：

```tsx
// tests/unit/PlaceholderView.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlaceholderView } from "@/components/ui/PlaceholderView";

describe("PlaceholderView 诚实占位", () => {
  it("渲染传入标题与 eyebrow", () => {
    render(
      <PlaceholderView
        eyebrow="CREDIT & ATTENDANCE"
        title="信用积分"
        emphasis="留痕"
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("信用积分");
    expect(screen.getByText("CREDIT & ATTENDANCE")).toBeInTheDocument();
  });

  it("必含明确的建设中诚实标注", () => {
    render(<PlaceholderView eyebrow="X" title="阅读联赛" />);
    expect(screen.getByText(/建设中/)).toBeInTheDocument();
    expect(screen.getByText(/未接后端/)).toBeInTheDocument();
  });

  it("不渲染任何 button（不放假写入入口）", () => {
    const { container } = render(<PlaceholderView eyebrow="X" title="做事空间" />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("有 status=under-construction 的可定位标识", () => {
    render(<PlaceholderView eyebrow="X" title="大家在干嘛" />);
    expect(screen.getByTestId("under-construction")).toBeInTheDocument();
  });
});
```

- [ ] 跑测试看失败：`npm run test -- tests/unit/PlaceholderView.test.tsx`。

- [ ] 写 `components/ui/PlaceholderView.module.css`（移植 `.placeholder-view h1` 排版 + 大符号 `.big-symbol` 手工感，加诚实徽标样式）：

```css
/* components/ui/PlaceholderView.module.css — 移植自 legacy-prototype/styles.css .placeholder-view / .big-symbol */
.placeholderView {
  min-height: 620px;
  padding-top: 57px;
  max-width: 1420px;
  margin: auto;
  padding-left: clamp(25px, 4.2vw, 70px);
  padding-right: clamp(25px, 4.2vw, 70px);
}

.eyebrow {
  margin: 0;
  letter-spacing: 1.45px;
  color: #8490a2;
  font-size: 10px;
  font-weight: 800;
}

.title {
  max-width: 600px;
  margin: 10px 0;
  font-size: clamp(35px, 4.25vw, 60px);
  font-weight: 800;
  letter-spacing: -4px;
  line-height: 1.08;
}

.title i {
  position: relative;
  color: #ee725c;
  font-family: Georgia, "Noto Serif SC", serif;
  font-weight: 400;
  letter-spacing: -4px;
}

.title i::after {
  content: "";
  position: absolute;
  height: 8px;
  z-index: -1;
  left: -2px;
  right: -3px;
  bottom: 3px;
  background: var(--yellow);
  transform: rotate(-2deg);
}

.bigSymbol {
  width: 55px;
  height: 55px;
  display: grid;
  margin: 0 0 22px;
  place-items: center;
  border-radius: 17px;
  background: var(--yellow);
  color: var(--ink);
  font-size: 27px;
  transform: rotate(-8deg);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 30px;
  padding: 10px 16px;
  border: 1px dashed #ccd3d9;
  border-radius: 12px;
  background: var(--white);
  color: #718093;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.badge span {
  color: #ee725c;
  font-size: 16px;
}
```

- [ ] 写实现 `components/ui/PlaceholderView.tsx`：

```tsx
// components/ui/PlaceholderView.tsx
import styles from "./PlaceholderView.module.css";

export function PlaceholderView({
  eyebrow,
  title,
  emphasis,
  symbol = "✦",
}: {
  eyebrow: string;
  title: string;
  /** 标题里用珊瑚色衬线强调的词，可选 */
  emphasis?: string;
  symbol?: string;
}) {
  return (
    <section className={styles.placeholderView}>
      <div className={styles.bigSymbol} aria-hidden="true">
        {symbol}
      </div>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>
        {title}
        {emphasis ? (
          <>
            {" "}
            <i>{emphasis}</i>
          </>
        ) : null}
      </h1>
      <p className={styles.badge} data-testid="under-construction">
        <span aria-hidden="true">✦</span>
        这里正在建设中，先放着占个位 · 未接后端 · 示例仅供感受
      </p>
    </section>
  );
}
```

- [ ] 跑测试看通过：`npm run test -- tests/unit/PlaceholderView.test.tsx`。

- [ ] commit：

```bash
git add components/ui/PlaceholderView.tsx components/ui/PlaceholderView.module.css tests/unit/PlaceholderView.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): PlaceholderView 诚实占位组件（5 空间复用，无假按钮）

满足 spec §2.4 / 验收 E 第1条。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6：ShellChrome 客户端壳（active 高亮 + 窄屏导航开合）

**目标**：一个 `"use client"` 叶子壳，包住 Sidebar + Topbar，负责两件"浏览器里的事"：①用 `usePathname()` 算 `activeHref` 传给 Sidebar；②窄屏汉堡菜单开合（`.sidebar.open`）。把 `"use client"` 收敛到此组件，页面与 layout 仍是 Server Component（遵守 §4.2 边界手法）。走 TDD（用 mock pathname）。

**Files:**
- Create: `components/shell/ShellChrome.tsx`
- Create: `components/shell/ShellChrome.module.css`
- Test: `tests/unit/ShellChrome.test.tsx`

**Steps:**

- [ ] 写失败测试 `tests/unit/ShellChrome.test.tsx`（mock `next/navigation`）：

```tsx
// tests/unit/ShellChrome.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/courses",
}));

import { ShellChrome } from "@/components/shell/ShellChrome";

describe("ShellChrome", () => {
  it("据 pathname 高亮当前导航项", () => {
    render(
      <ShellChrome crumb="课程">
        <div>内容</div>
      </ShellChrome>,
    );
    const current = screen.getByRole("link", { name: /课程/ });
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("点汉堡菜单切换侧栏 open 态", () => {
    render(
      <ShellChrome crumb="课程">
        <div>内容</div>
      </ShellChrome>,
    );
    const sidebar = screen.getByRole("navigation", { name: "主导航" });
    expect(sidebar.className).not.toMatch(/open/);
    fireEvent.click(screen.getByRole("button", { name: /打开导航/ }));
    expect(sidebar.className).toMatch(/open/);
  });

  it("渲染 children 内容", () => {
    render(
      <ShellChrome crumb="课程">
        <div>页面主体</div>
      </ShellChrome>,
    );
    expect(screen.getByText("页面主体")).toBeInTheDocument();
  });
});
```

- [ ] 跑测试看失败：`npm run test -- tests/unit/ShellChrome.test.tsx`。

- [ ] 写 `components/shell/ShellChrome.module.css`（app-shell 网格 + main-content + 窄屏 fixed 侧栏开合 + 遮罩，移植原型 §57/58 媒体查询要点；`open` class 由本组件加到 Sidebar）：

```css
/* components/shell/ShellChrome.module.css — 移植自 legacy-prototype/styles.css .app-shell + 媒体查询 */
.appShell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 238px minmax(0, 1fr);
}

.mainContent {
  min-width: 0;
  padding-bottom: 60px;
}

.scrim {
  display: none;
}

@media (max-width: 1050px) {
  .appShell {
    grid-template-columns: 205px minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .appShell {
    display: block;
  }

  /* 窄屏：侧栏 fixed 抽屉，默认移出屏外，.open 滑入 */
  .appShell :global(aside[aria-label="主导航"]) {
    position: fixed;
    left: 0;
    top: 0;
    width: 240px;
    transform: translateX(-100%);
    transition: 0.25s ease;
  }

  .appShell :global(aside.open) {
    transform: none;
    box-shadow: 15px 0 35px rgba(18, 30, 48, 0.2);
  }

  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(19, 31, 50, 0.42);
    z-index: 4;
    border: 0;
    width: 100%;
    height: 100%;
  }
}
```

> 说明：窄屏汉堡显示由 Topbar.module.css 的 `@media (max-width:720px) .mobileMenu{display:block}` 控制（见下一 step 补一行），桌面隐藏。`:global(aside.open)` 命中 Sidebar 通过 props 加的 `open` class。

- [ ] 在 `components/shell/Topbar.module.css` 末尾补窄屏规则（让汉堡仅窄屏出现、桌面图标钮收起，移植原型 §58）：

```css
@media (max-width: 720px) {
  .topbar {
    height: 66px;
    padding: 0 17px;
  }
  .crumb {
    display: none;
  }
  .topActions {
    margin-left: auto;
  }
  .mobileMenu {
    display: block;
  }
}
```

- [ ] 写实现 `components/shell/ShellChrome.tsx`：

```tsx
// components/shell/ShellChrome.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import styles from "./ShellChrome.module.css";

export function ShellChrome({
  crumb,
  children,
}: {
  crumb: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.appShell}>
      <Sidebar activeHref={pathname} className={menuOpen ? "open" : ""} />
      {menuOpen ? (
        <button
          type="button"
          className={styles.scrim}
          aria-label="关闭导航"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <main className={styles.mainContent}>
        <Topbar crumb={crumb} onMenuClick={() => setMenuOpen((v) => !v)} />
        {children}
      </main>
    </div>
  );
}
```

> 注意：`Sidebar` 的 `className` prop 传裸 `"open"` 字符串（非 module class），因 `ShellChrome.module.css` 用 `:global(aside.open)` 命中——这是有意为之，让两个 Module 协作；测试断言 `/open/` 子串即覆盖。

- [ ] 跑测试看通过：`npm run test -- tests/unit/ShellChrome.test.tsx`。

- [ ] commit：

```bash
git add components/shell/ShellChrome.tsx components/shell/ShellChrome.module.css components/shell/Topbar.module.css tests/unit/ShellChrome.test.tsx
git commit -m "$(cat <<'EOF'
feat(shell): ShellChrome 客户端壳（pathname 高亮 + 窄屏导航开合）

use client 收敛到此叶子；layout/page 仍为 Server Component（spec §4.2）。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7：根布局 `app/layout.tsx` 接入 globals

**目标**：根布局引一次 `globals.css`、设 `<html lang="zh-CN">` 与 metadata（移植原型 `<title>`/`theme-color`）。不含外壳（外壳在 `(shell)/layout.tsx`，因为登录页 `(auth)` 不要外壳）。满足 §4.1、§4.5 第 1 条。执行 + 验证。

**Files:**
- Create: `app/layout.tsx`
- Test: `tests/unit/root-layout.test.tsx`

**Steps:**

- [ ] 写失败测试 `tests/unit/root-layout.test.tsx`（断言 metadata 与 html lang）：

```tsx
// tests/unit/root-layout.test.tsx
import { describe, it, expect } from "vitest";
import RootLayout, { metadata } from "@/app/layout";

describe("根布局", () => {
  it("metadata 标题含 好奇 Online", () => {
    expect(String(metadata.title)).toMatch(/好奇\s*Online/);
  });

  it("themeColor / metadata 配置存在", () => {
    expect(metadata).toBeTruthy();
  });

  it("默认导出是组件函数", () => {
    expect(typeof RootLayout).toBe("function");
  });
});
```

- [ ] 跑测试看失败：`npm run test -- tests/unit/root-layout.test.tsx`。

- [ ] 写实现 `app/layout.tsx`：

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "好奇 Online — 今天发生什么？",
  description: "好奇学习社区的线上共同空间。",
};

export const viewport: Viewport = {
  themeColor: "#17243d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] 跑测试看通过：`npm run test -- tests/unit/root-layout.test.tsx`。

- [ ] commit：

```bash
git add app/layout.tsx tests/unit/root-layout.test.tsx
git commit -m "$(cat <<'EOF'
feat(shell): 根布局接入 globals.css + metadata（移植原型 title/theme-color）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8：登录后外壳布局 `app/(shell)/layout.tsx` + 面包屑映射

**目标**：`(shell)` 路由组的布局用 `ShellChrome` 包住所有登录后页面，并按当前路径算面包屑文案。本阶段面包屑映射用一个纯函数 `crumbForPath`（可单测），默认值兜底"此刻"。满足 §2.0 外壳沿用、§4.1 目录。走 TDD（先测 `crumbForPath`）。

**Files:**
- Create: `lib/crumbs.ts`
- Create: `app/(shell)/layout.tsx`
- Test: `tests/unit/crumbs.test.ts`

**Steps:**

- [ ] 写失败测试 `tests/unit/crumbs.test.ts`：

```ts
// tests/unit/crumbs.test.ts
import { describe, it, expect } from "vitest";
import { crumbForPath } from "@/lib/crumbs";

describe("crumbForPath 面包屑映射", () => {
  it.each([
    ["/", "此刻"],
    ["/courses", "课程"],
    ["/courses/abc", "课程"],
    ["/courses/abc/posts/xyz", "课程"],
    ["/my-week", "我的一周"],
    ["/credits", "信用积分"],
    ["/reading", "阅读联赛"],
    ["/projects", "做事空间"],
    ["/community", "大家在干嘛"],
  ])("%s → %s", (path, crumb) => {
    expect(crumbForPath(path)).toBe(crumb);
  });

  it("未知路径兜底为 此刻", () => {
    expect(crumbForPath("/unknown")).toBe("此刻");
  });
});
```

- [ ] 跑测试看失败：`npm run test -- tests/unit/crumbs.test.ts`。

- [ ] 写实现 `lib/crumbs.ts`（复用 NAV_ITEMS，最长前缀匹配）：

```ts
// lib/crumbs.ts
import { NAV_ITEMS } from "@/components/shell/nav-items";

export function crumbForPath(pathname: string): string {
  if (pathname === "/") return "此刻";
  // 取能作为前缀命中的最长 href（排除根，根仅精确匹配）
  const match = NAV_ITEMS.filter((i) => i.href !== "/")
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match ? match.label : "此刻";
}
```

- [ ] 跑测试看通过：`npm run test -- tests/unit/crumbs.test.ts`。

- [ ] 写实现 `app/(shell)/layout.tsx`（Server Component；面包屑因 layout 无法直接拿 pathname，本阶段用 `ShellChrome` 内部已有 `usePathname`，故把面包屑计算也下放：给 `ShellChrome` 传 `crumbResolver` 不便序列化，改为让 `ShellChrome` 自身调用 `crumbForPath`。见下一 step 调整 ShellChrome 签名）：

```tsx
// app/(shell)/layout.tsx
import { ShellChrome } from "@/components/shell/ShellChrome";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShellChrome>{children}</ShellChrome>;
}
```

- [ ] 调整 `components/shell/ShellChrome.tsx`：移除外部 `crumb` prop，内部用 `crumbForPath(pathname)` 自算（面包屑随路由变，本就是浏览器侧的事）。改动后文件：

```tsx
// components/shell/ShellChrome.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { crumbForPath } from "@/lib/crumbs";
import styles from "./ShellChrome.module.css";

export function ShellChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.appShell}>
      <Sidebar activeHref={pathname} className={menuOpen ? "open" : ""} />
      {menuOpen ? (
        <button
          type="button"
          className={styles.scrim}
          aria-label="关闭导航"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <main className={styles.mainContent}>
        <Topbar crumb={crumbForPath(pathname)} onMenuClick={() => setMenuOpen((v) => !v)} />
        {children}
      </main>
    </div>
  );
}
```

- [ ] 同步更新 `tests/unit/ShellChrome.test.tsx`：移除给 `ShellChrome` 传 `crumb` 的写法（现在内部自算），断言面包屑文案改为校验渲染出 `课程`（mock pathname=`/courses`）。替换原文件为：

```tsx
// tests/unit/ShellChrome.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/courses",
}));

import { ShellChrome } from "@/components/shell/ShellChrome";

describe("ShellChrome", () => {
  it("据 pathname 高亮当前导航项并算面包屑", () => {
    render(
      <ShellChrome>
        <div>内容</div>
      </ShellChrome>,
    );
    expect(screen.getByRole("link", { name: /课程/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // 面包屑当前段
    expect(screen.getAllByText("课程").length).toBeGreaterThan(0);
  });

  it("点汉堡菜单切换侧栏 open 态", () => {
    render(
      <ShellChrome>
        <div>内容</div>
      </ShellChrome>,
    );
    const sidebar = screen.getByRole("navigation", { name: "主导航" });
    expect(sidebar.className).not.toMatch(/open/);
    fireEvent.click(screen.getByRole("button", { name: /打开导航/ }));
    expect(sidebar.className).toMatch(/open/);
  });

  it("渲染 children 内容", () => {
    render(
      <ShellChrome>
        <div>页面主体</div>
      </ShellChrome>,
    );
    expect(screen.getByText("页面主体")).toBeInTheDocument();
  });
});
```

- [ ] 跑全部受影响单测看通过：`npm run test -- tests/unit/crumbs.test.ts tests/unit/ShellChrome.test.tsx`。

- [ ] commit：

```bash
git add lib/crumbs.ts "app/(shell)/layout.tsx" components/shell/ShellChrome.tsx tests/unit/crumbs.test.ts tests/unit/ShellChrome.test.tsx
git commit -m "$(cat <<'EOF'
feat(shell): (shell) 路由组布局 + 面包屑映射（ShellChrome 自算 crumb）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9：真数据二页的本阶段占位 `/`（此刻）与 `/courses`

**目标**：建立 `(shell)/page.tsx`（此刻）与 `(shell)/courses/page.tsx`（课程列表）两个页面，本阶段它们**只挂在外壳里、能路由、有标题骨架**，真数据由后续阶段接入。诚实标注"数据接入中（本阶段先立外壳）"，但**不**用"建设中"占位组件（它们是 IN，不是 OUT，避免与真占位混淆）。满足 §2.0 路由、为后续阶段留挂载点。执行 + 验证。

**Files:**
- Create: `app/(shell)/page.tsx`
- Create: `app/(shell)/courses/page.tsx`
- Create: `app/(shell)/_components/StageScaffold.tsx`
- Create: `app/(shell)/_components/StageScaffold.module.css`
- Test: `tests/unit/stage-scaffold.test.tsx`

**Steps:**

- [ ] 写失败测试 `tests/unit/stage-scaffold.test.tsx`：

```tsx
// tests/unit/stage-scaffold.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StageScaffold } from "@/app/(shell)/_components/StageScaffold";

describe("StageScaffold（真数据页本阶段挂载点）", () => {
  it("渲染 eyebrow 与标题", () => {
    render(<StageScaffold eyebrow="TODAY" title="此刻" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("此刻");
    expect(screen.getByText("TODAY")).toBeInTheDocument();
  });

  it("诚实标注本阶段数据未接、区别于 5 空间的“建设中”", () => {
    render(<StageScaffold eyebrow="X" title="课程" />);
    expect(screen.getByText(/数据接入中/)).toBeInTheDocument();
  });
});
```

- [ ] 跑测试看失败：`npm run test -- tests/unit/stage-scaffold.test.tsx`。

- [ ] 写 `app/(shell)/_components/StageScaffold.module.css`（复用纸感 view 容器排版）：

```css
/* app/(shell)/_components/StageScaffold.module.css */
.view {
  max-width: 1420px;
  margin: auto;
  padding: 30px clamp(25px, 4.2vw, 70px);
}

.eyebrow {
  margin: 0;
  letter-spacing: 1.45px;
  color: #8490a2;
  font-size: 10px;
  font-weight: 800;
}

.title {
  max-width: 600px;
  margin: 9px 0 10px;
  font-size: clamp(35px, 4.25vw, 60px);
  font-weight: 800;
  letter-spacing: -4px;
  line-height: 1.08;
}

.note {
  margin-top: 18px;
  padding: 12px 16px;
  border: 1px dashed #ccd3d9;
  border-radius: 12px;
  background: var(--white);
  color: #718093;
  font-size: 12px;
  font-weight: 700;
}
```

- [ ] 写 `app/(shell)/_components/StageScaffold.tsx`：

```tsx
// app/(shell)/_components/StageScaffold.tsx
import styles from "./StageScaffold.module.css";

export function StageScaffold({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <section className={styles.view}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.note}>
        本空间为首切片真数据模块，外壳已就位 · 数据接入中（后续阶段接入此刻 / 课程的真数据）
      </p>
    </section>
  );
}
```

> 诚实说明：此刻/课程是 IN，不冒充"建设中占位"。文案明确"数据接入中"，与 5 个 OUT 占位（"建设中 · 未接后端"）措辞区分，避免把真模块误标成砍掉的占位。

- [ ] 写 `app/(shell)/page.tsx`：

```tsx
// app/(shell)/page.tsx
import { StageScaffold } from "./_components/StageScaffold";

export default function HomePage() {
  return <StageScaffold eyebrow="今天 · PULSE" title="此刻" />;
}
```

- [ ] 写 `app/(shell)/courses/page.tsx`：

```tsx
// app/(shell)/courses/page.tsx
import { StageScaffold } from "../_components/StageScaffold";

export default function CoursesPage() {
  return <StageScaffold eyebrow="COURSE FEED" title="课程" />;
}
```

- [ ] 跑测试看通过：`npm run test -- tests/unit/stage-scaffold.test.tsx`。

- [ ] commit：

```bash
git add "app/(shell)/page.tsx" "app/(shell)/courses/page.tsx" "app/(shell)/_components/StageScaffold.tsx" "app/(shell)/_components/StageScaffold.module.css" tests/unit/stage-scaffold.test.tsx
git commit -m "$(cat <<'EOF'
feat(shell): 此刻/课程 本阶段外壳挂载点（数据接入中，区别于占位）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10：5 个诚实占位页路由 `(shell)/(placeholders)/*`

**目标**：建 5 个占位页（`my-week / credits / reading / projects / community`），各用 `PlaceholderView` 渲染明确"建设中"，文案对齐原型对应 hero 调性。满足 §2.4、验收 E 第 1 条、§4.1 目录。执行 + 验证。

**Files:**
- Create: `app/(shell)/(placeholders)/my-week/page.tsx`
- Create: `app/(shell)/(placeholders)/credits/page.tsx`
- Create: `app/(shell)/(placeholders)/reading/page.tsx`
- Create: `app/(shell)/(placeholders)/projects/page.tsx`
- Create: `app/(shell)/(placeholders)/community/page.tsx`
- Test: `tests/unit/placeholder-pages.test.tsx`

**Steps:**

- [ ] 写失败测试 `tests/unit/placeholder-pages.test.tsx`（逐页断言标题 + 建设中标注 + 无 button）：

```tsx
// tests/unit/placeholder-pages.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MyWeek from "@/app/(shell)/(placeholders)/my-week/page";
import Credits from "@/app/(shell)/(placeholders)/credits/page";
import Reading from "@/app/(shell)/(placeholders)/reading/page";
import Projects from "@/app/(shell)/(placeholders)/projects/page";
import Community from "@/app/(shell)/(placeholders)/community/page";

const pages: Array<[string, () => React.ReactNode]> = [
  ["我的一周", MyWeek],
  ["信用积分", Credits],
  ["阅读联赛", Reading],
  ["做事空间", Projects],
  ["大家在干嘛", Community],
];

describe("5 个诚实占位页", () => {
  it.each(pages)("%s 渲染标题 + 建设中标注 + 无假按钮", (title, Page) => {
    const { container } = render(<>{Page()}</>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
    expect(screen.getByTestId("under-construction")).toBeInTheDocument();
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});
```

- [ ] 跑测试看失败：`npm run test -- tests/unit/placeholder-pages.test.tsx`。

- [ ] 写 5 个页面实现：

```tsx
// app/(shell)/(placeholders)/my-week/page.tsx
import { PlaceholderView } from "@/components/ui/PlaceholderView";

export default function MyWeekPage() {
  return (
    <PlaceholderView
      eyebrow="MY WEEK / 个人视图"
      title="我的一周"
      emphasis="舒服的样子"
      symbol="▦"
    />
  );
}
```

```tsx
// app/(shell)/(placeholders)/credits/page.tsx
import { PlaceholderView } from "@/components/ui/PlaceholderView";

export default function CreditsPage() {
  return (
    <PlaceholderView
      eyebrow="CREDIT & ATTENDANCE"
      title="信用积分"
      emphasis="把选择留痕"
      symbol="✳"
    />
  );
}
```

```tsx
// app/(shell)/(placeholders)/reading/page.tsx
import { PlaceholderView } from "@/components/ui/PlaceholderView";

export default function ReadingPage() {
  return (
    <PlaceholderView
      eyebrow="READING LEAGUE"
      title="阅读联赛"
      emphasis="有了回声"
      symbol="⌁"
    />
  );
}
```

```tsx
// app/(shell)/(placeholders)/projects/page.tsx
import { PlaceholderView } from "@/components/ui/PlaceholderView";

export default function ProjectsPage() {
  return (
    <PlaceholderView
      eyebrow="MAKE THINGS HAPPEN"
      title="做事空间"
      emphasis="放到桌面上来"
      symbol="◫"
    />
  );
}
```

```tsx
// app/(shell)/(placeholders)/community/page.tsx
import { PlaceholderView } from "@/components/ui/PlaceholderView";

export default function CommunityPage() {
  return (
    <PlaceholderView
      eyebrow="THE COMMON ROOM"
      title="大家在干嘛"
      emphasis="有什么想说"
      symbol="◎"
    />
  );
}
```

- [ ] 跑测试看通过：`npm run test -- tests/unit/placeholder-pages.test.tsx`。

- [ ] commit：

```bash
git add "app/(shell)/(placeholders)" tests/unit/placeholder-pages.test.tsx
git commit -m "$(cat <<'EOF'
feat(placeholders): 5 个诚实建设中占位页（我的一周/积分/阅读/做事/大家）

满足 spec §2.4 / 验收 E 第1条：5 入口都在、点进去明确建设中、无假按钮。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11：构建闭环验证 + 全量单测 + lint

**目标**：确认本阶段所有路由能编译、`tsc`/lint/build 通过，七路由都能渲染。这是 IN 的工程门槛（§6.5），非 TDD，走"执行 + 明确验证"。

**Files:**
- Test:（无新增源文件；运行既有命令验证）

**Steps:**

- [ ] 跑全量单测：`npm run test`（所有 `tests/unit/*` 应全绿）。

- [ ] 跑类型检查：`npm run lint`（含 ESLint + 应配 `tsc --noEmit`；若 lint 脚本未含类型检查，另跑 `npx tsc --noEmit`）。预期 0 error。

- [ ] 跑生产构建：`npm run build`。预期成功，且产物路由清单含：`/`、`/courses`、`/my-week`、`/credits`、`/reading`、`/projects`、`/community`（Next 构建输出的 Route 列表里逐一核对 7 条都在）。

- [ ] 若构建报 `(shell)`/`(placeholders)` 路由组未生成预期路径，核对目录：路由组括号目录**不进 URL**，故 `(shell)/(placeholders)/credits/page.tsx` 对应 `/credits`（正确）；`(shell)/page.tsx` 对应 `/`（正确）。修正任何放错层级的 `page.tsx` 后重跑 `npm run build`。

- [ ] commit（仅当上面任一步需要修文件；纯验证通过则跳过本 commit）：

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(shell): 修正阶段1路由层级，build/lint/test 全绿

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12：Playwright 截图对齐 + 可达性 + 响应式不溢出（验收 F + §2.5）

**目标**：用 Playwright 做视觉与可达性断言，覆盖验收 F（桌面纸感/海军蓝/语义色、窄屏导航可展开不横向溢出、手工感保留）与 §2.5（图标钮有 aria-label、可聚焦）。e2e 走"执行 + 明确验证（截图比对 + 断言）"。

**Files:**
- Create: `e2e/shell.spec.ts`
- Create: `e2e/shell.responsive.spec.ts`

**Steps:**

- [ ] 写 `e2e/shell.spec.ts`（桌面：外壳元素 + 七导航 + 顶栏诚实态 + 截图基线 + active 高亮）：

```ts
// e2e/shell.spec.ts
import { test, expect } from "@playwright/test";

test.describe("应用外壳（桌面）", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("侧栏 7 入口齐全，此刻为默认 active", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "主导航" });
    await expect(nav.getByRole("link")).toHaveCount(7);
    await expect(page.getByRole("link", { name: /此刻/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("顶栏三钮诚实：搜索/通知禁用、＋发起禁用、无假红点", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /搜索（建设中）/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /通知（建设中）/ })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /发起一件事（建设中）/ }),
    ).toBeDisabled();
  });

  test("纸感背景与海军蓝侧栏色值正确（验收 F）", async ({ page }) => {
    await page.goto("/");
    const bodyBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bodyBg).toBe("rgb(246, 245, 240)"); // --paper #f6f5f0
    const sidebar = page.getByRole("navigation", { name: "主导航" });
    const sidebarBg = await sidebar.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(sidebarBg).toBe("rgb(25, 41, 67)"); // --navy #192943
  });

  test("brand-mark 保留手工旋转（不被磨平）", async ({ page }) => {
    await page.goto("/");
    const mark = page.getByText("好", { exact: true }).first();
    const transform = await mark.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    expect(transform).not.toBe("none"); // rotate(-5deg) 生效
  });

  test("导航到课程页面后 课程 高亮、可前进后退恢复（验收 G 第1条）", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /课程/ }).click();
    await expect(page).toHaveURL(/\/courses$/);
    await expect(page.getByRole("link", { name: /课程/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /此刻/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("外壳桌面视觉基线截图", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveScreenshot("shell-desktop-home.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("5 个占位页都明确建设中、无假按钮（验收 E 第1条）", async ({ page }) => {
    for (const path of ["/my-week", "/credits", "/reading", "/projects", "/community"]) {
      await page.goto(path);
      await expect(page.getByTestId("under-construction")).toBeVisible();
      await expect(page.locator("section button")).toHaveCount(0);
    }
  });
});
```

- [ ] 写 `e2e/shell.responsive.spec.ts`（窄屏：汉堡可展开、内容不横向溢出）：

```ts
// e2e/shell.responsive.spec.ts
import { test, expect } from "@playwright/test";

test.describe("应用外壳（窄屏）", () => {
  test.use({ viewport: { width: 375, height: 780 } });

  test("窄屏默认收起侧栏，汉堡可展开/遮罩可关闭", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByRole("navigation", { name: "主导航" });
    // 收起态：移出视口（x < 0）
    let box = await sidebar.boundingBox();
    expect(box!.x).toBeLessThan(0);

    await page.getByRole("button", { name: /打开导航/ }).click();
    box = await sidebar.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);

    await page.getByRole("button", { name: /关闭导航/ }).click();
    box = await sidebar.boundingBox();
    expect(box!.x).toBeLessThan(0);
  });

  test("窄屏内容不横向溢出（验收 F 第2条 / §2.5）", async ({ page }) => {
    for (const path of ["/", "/courses", "/credits", "/community"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1); // 允许 1px 取整误差，不得横向滚动
    }
  });

  test("窄屏外壳视觉基线截图", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveScreenshot("shell-mobile-home.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
```

- [ ] 首次跑生成截图基线：`npm run test:e2e -- --update-snapshots`（生成 `shell-desktop-home.png` / `shell-mobile-home.png` 基线）。人工打开生成的基线 PNG **对照 `legacy-prototype/index.html` 浏览器渲染**确认：海军蓝侧栏 + 纸感背景 + 黄色 brand-mark 旋转 + 7 导航在位，无黑白/玻璃/英文大 hero 化（验收 F）。若不符，回到对应组件 Task 修 CSS 再重生成。

- [ ] 正式跑 e2e 看全绿：`npm run test:e2e`（断言 + 截图比对均通过）。

- [ ] commit（含基线快照）：

```bash
git add e2e/shell.spec.ts e2e/shell.responsive.spec.ts e2e/**/*.png
git commit -m "$(cat <<'EOF'
test(e2e): 外壳视觉基线 + 可达性 + 窄屏不溢出（验收 F/G/E + §2.5）

桌面/窄屏截图基线对照 legacy-prototype 确认无视觉回归。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### 阶段 1 收尾自检（执行者勾完才算交付）

- [ ] 7 个路由 `/ /courses /my-week /credits /reading /projects /community` 均可访问、外壳一致、无白屏（验收 G 第1条 / E 第1条）。
- [ ] 顶栏搜索/通知禁用、无 `notification-dot` 假红点、＋发起一件事不弹任何表单（验收 E 第4条）。
- [ ] 桌面纸感 + 海军蓝 + 黄/珊瑚/蓝/薄荷语义色与 `legacy-prototype` 对齐；手工感（brand-mark 旋转）保留；无黑白/玻璃/赛博/英文大 hero（验收 F 第1、3条）。
- [ ] 窄屏导航可展开、内容不横向溢出（验收 F 第2条 / §2.5）。
- [ ] `npm run test`、`npm run lint`、`npm run build`、`npm run test:e2e` 全绿（§6.5 门槛）。
- [ ] 此刻 / 课程是真模块挂载点（标"数据接入中"），与 5 个 OUT 占位（标"建设中 · 未接后端"）措辞区分，无诚实纪律违例。

> **交接说明**：本阶段产出 `components/shell/*`、`components/ui/{Avatar,PlaceholderView}`、`app/layout.tsx`、`app/(shell)/layout.tsx` 为公共地基（§4.6），后续阶段接此刻/课程真数据时只在 `app/(shell)/page.tsx`、`app/(shell)/courses/**` 内替换 `StageScaffold`，**不改外壳与 globals.css**；改这些公共文件需先开 issue。

---

相关文件（绝对路径）：
- 设计 spec（事实来源）：`C:/Users/david/haoqi-online/docs/specs/2026-06-21-haoqi-online-first-slice-design.md`（本阶段依据 §2.0 / §2.4 / §2.5 / §4.1 / §4.5）
- 原型 token 来源：`C:/Users/david/haoqi-online/styles.css`（迁移后 `legacy-prototype/styles.css`）
- 原型外壳 DOM：`C:/Users/david/haoqi-online/index.html`（迁移后 `legacy-prototype/index.html`）

> 说明：spec §6.1 提到 `src/app/`，但共享背景「已锁定约定」与 §4.1 用根级 `lib/supabase/...`、`app/...`（无 `src/` 前缀）。本计划统一采用**根级**布局以与已锁约定一致；若阶段 0 实际用了 `src/`，执行者须把以上所有 `app/ components/ lib/` 路径整体加 `src/` 前缀并保持 `@/` 别名映射不变。

---

## 阶段 2：数据库 schema + RLS + 种子数据

> **唯一事实来源：** 本阶段所有表名/字段名/约束/RLS 严格按 spec §3.0–§3.11、§5.2、§5.5。`User` 物理实现为 `public.profiles`（字段权威在 §5.2）。其余 8 张业务表用 PascalCase 双引号标识符（`"Term"`、`"Course"`、`"CourseMembership"`、`"ScheduleSlot"`、`"ScheduleChange"`、`"Post"`、`"PostAsset"`、`"Comment"`），与 §3.0 辅助函数里 `public."CourseMembership"` 等引用保持一致。
>
> **前置依赖（阶段 1 已完成）：** 仓库根已 `supabase init`（存在 `supabase/config.toml`），`package.json` 已装 `@supabase/supabase-js`、`vitest`、`dotenv`，且 `npm run test` = `vitest run`。本阶段所有迁移文件加进 `supabase/migrations/`，本地用 `npx supabase db reset` 套用 migration + seed 后跑集成测试。
>
> **迁移文件命名：** 用 spec 日期前缀 + 递增序号，保证 `supabase db reset` 按字典序套用：`20260621090000_*.sql` … `20260621093000_*.sql`。
>
> **集成测试机制（统一）：** 每个 RLS 测试建两个 client——`anonClient`（用 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，并用 seed 里某测试账号的 JWT 通过 `auth.signInWithPassword` 或预生成 access token 模拟该用户）与 `adminClient`（`SUPABASE_SERVICE_ROLE_KEY`，绕过 RLS）。本切片正式登录是 magic link，但**测试**用 seed 预置的「带密码的测试账号」直接 `signInWithPassword` 拿到对应 `auth.uid()` 的 JWT，从而让 RLS 函数 `auth.uid()` 返回该测试用户 id。所有测试连本地 Supabase（`supabase start` 暴露的 `http://127.0.0.1:54321`）。

---

### Task 1：测试基建——本地 Supabase 连接 + 测试客户端工厂 + 固定测试 UUID

建立后续所有集成测试共用的连接工厂与固定 id 常量，避免每个测试重复样板。本任务是脚手架（执行 + 验证），不走 TDD。

满足：为 §6.6 I（安全负样本进 CI）提供运行载体；不变量 §3.11 全部测试的基础设施。

**Files:**
- Create: `C:/Users/david/haoqi-online/tests/db/helpers/clients.ts`
- Create: `C:/Users/david/haoqi-online/tests/db/helpers/ids.ts`
- Create: `C:/Users/david/haoqi-online/.env.test.local`
- Modify: `C:/Users/david/haoqi-online/.gitignore`

**Steps:**

- [ ] 创建 `C:/Users/david/haoqi-online/.env.test.local`，写入本地 Supabase 默认连接信息（`supabase start` 输出的固定 demo key，本地专用，非生产密钥）：
  ```dotenv
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
  ```
  > 注：上述 anon/service_role JWT 是 Supabase CLI 本地栈对所有人固定相同的内置 demo 密钥（非真实生产密钥），可安全入仓用于本地测试；生产密钥永不进仓。

- [ ] 修改 `C:/Users/david/haoqi-online/.gitignore`，**确保 `.env.test.local` 不被忽略**（它含本地 demo key，需入仓让 CI 跑）。在文件末尾追加一行例外（若现有规则忽略了 `.env*.local`）：
  ```gitignore
  !.env.test.local
  ```

- [ ] 创建 `C:/Users/david/haoqi-online/tests/db/helpers/ids.ts`，写入 seed 与测试共用的固定 UUID 常量（seed 与测试必须用同一组 id 才能精确断言）：
  ```ts
  // 固定 UUID：seed.sql 与集成测试共用。改这里必须同步改 seed。
  export const USERS = {
    admin: '00000000-0000-0000-0000-0000000000a1',
    teacherA: '00000000-0000-0000-0000-0000000000t1', // 课程「问题与方法」teacher
    teacherB: '00000000-0000-0000-0000-0000000000t2', // 课程「城市漫游」teacher
    assistantA: '00000000-0000-0000-0000-0000000000a2', // 课程「问题与方法」assistant
    studentA: '00000000-0000-0000-0000-0000000000s1', // 两课 member
    studentB: '00000000-0000-0000-0000-0000000000s2', // 非「问题与方法」成员
  } as const;

  export const TERMS = {
    spring2026: '00000000-0000-0000-0000-0000000000e1',
  } as const;

  export const COURSES = {
    method: '00000000-0000-0000-0000-0000000000c1', // 问题与方法（teacherA / assistantA / studentA / studentB）
    city: '00000000-0000-0000-0000-0000000000c2', // 城市漫游（teacherB / studentA）
  } as const;

  export const SLOTS = {
    methodMon: '00000000-0000-0000-0000-00000000005a',
    cityWed: '00000000-0000-0000-0000-00000000005b',
    freeFri: '00000000-0000-0000-0000-00000000005c', // slot_kind='free'，course_id null
  } as const;

  export const POSTS = {
    methodPub1: '00000000-0000-0000-0000-0000000000p1', // 问题与方法 published
    methodPub2: '00000000-0000-0000-0000-0000000000p2', // 问题与方法 published（带多图）
    methodDraft: '00000000-0000-0000-0000-0000000000p3', // 问题与方法 draft（作者 teacherA）
    cityPub1: '00000000-0000-0000-0000-0000000000p4', // 城市漫游 published
  } as const;

  export const ASSETS = {
    methodPub2Img1: '00000000-0000-0000-0000-0000000000f1',
    methodPub2Img2: '00000000-0000-0000-0000-0000000000f2',
    methodDraftImg: '00000000-0000-0000-0000-0000000000f3', // 草稿帖的图，验收负样本
  } as const;

  export const COMMENTS = {
    onMethodPub1ByStudentA: '00000000-0000-0000-0000-0000000000d1',
    onMethodPub1ByTeacherA: '00000000-0000-0000-0000-0000000000d2',
  } as const;

  export const CHANGES = {
    methodMonLocation: '00000000-0000-0000-0000-0000000000a9', // teacherA 发的调地点
  } as const;

  export const TEST_PASSWORD = 'haoqi-test-pw-0621';
  ```

- [ ] 创建 `C:/Users/david/haoqi-online/tests/db/helpers/clients.ts`，写入客户端工厂（admin 绕过 RLS；asUser 用密码登录拿到该用户 JWT 的 anon client）：
  ```ts
  import { createClient, type SupabaseClient } from '@supabase/supabase-js';
  import { config } from 'dotenv';
  import { TEST_PASSWORD } from './ids';

  config({ path: '.env.test.local' });

  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!URL || !ANON || !SERVICE) {
    throw new Error('缺少 .env.test.local 中的 Supabase 连接变量');
  }

  // service-role：绕过 RLS，用于灌数据 / 断言「数据库里真有这行」
  export function adminClient(): SupabaseClient {
    return createClient(URL, SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // 完全匿名（未登录）：auth.uid() 为 null
  export function anonClient(): SupabaseClient {
    return createClient(URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // 以某 seed 测试账号登录，返回带其 JWT 的 anon client（RLS 下 auth.uid() = 该用户）
  export async function asUser(email: string): Promise<SupabaseClient> {
    const c = createClient(URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await c.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });
    if (error) throw new Error(`测试账号登录失败 ${email}: ${error.message}`);
    return c;
  }

  // seed 里测试账号的邮箱（与 seed.sql 一致）
  export const EMAILS = {
    admin: 'admin@haoqi.test',
    teacherA: 'teacher-a@haoqi.test',
    teacherB: 'teacher-b@haoqi.test',
    assistantA: 'assistant-a@haoqi.test',
    studentA: 'student-a@haoqi.test',
    studentB: 'student-b@haoqi.test',
  } as const;
  ```

- [ ] 验证 helper 文件 TypeScript 可解析（不连库，只编译）：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx tsc --noEmit tests/db/helpers/clients.ts tests/db/helpers/ids.ts
  ```
  期望：无类型错误退出 0。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git checkout -b phase2-db-schema-rls && git add tests/db/helpers .env.test.local .gitignore && git commit -m "test(db): 测试客户端工厂与固定测试 UUID 基建

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 2：迁移 01——枚举校验与扩展前置（约定层）

本切片所有「枚举」用 `text + check` 实现（spec §3 表格里全是 `check (... in (...))`，不引 PG enum 类型，便于后续切片扩约束无需 `ALTER TYPE`）。本任务建一个空壳迁移确认 `pgcrypto`（`gen_random_uuid()`）可用，并放置 schema 注释。脚手架任务。

满足：§3 各表 `default gen_random_uuid()` 的前置；不变量基础。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621090000_extensions.sql`

**Steps:**

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621090000_extensions.sql`：
  ```sql
  -- 阶段 2 / 迁移 01：扩展与全局约定
  -- gen_random_uuid() 由 pgcrypto 提供（Supabase 本地栈默认装在 extensions schema）
  create extension if not exists pgcrypto;

  comment on schema public is '好奇 Online 首切片业务表：profiles + 8 张 PascalCase 业务表，全部启用 RLS（见 spec §3）';
  ```

- [ ] 套用并验证扩展可用：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功，无报错。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621090000_extensions.sql && git commit -m "feat(db): 迁移 01 扩展与 schema 约定

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 3：迁移 02——9 张表 + 枚举 check + 外键 + 约束 + 索引（结构层，先不加 RLS/触发器）

按 §5.2 建 `profiles`，按 §3.2–§3.9 建其余 8 表，含所有 `check`、FK、PK、唯一索引、`cascade`。本任务**只建结构**，RLS（Task 5+）与触发器（Task 4）后续迁移加。脚手架任务（执行 + 结构验证）。

满足：不变量 §3.11.1（调课不覆写——结构上 `ScheduleChange` 独立表）、§3.11.2（课程实体永驻——`Course/ScheduleSlot` 独立）、§3.11.7（软删列存在）；§6.6 D 的表结构前提。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621091000_tables.sql`
- Create: `C:/Users/david/haoqi-online/tests/db/structure.test.ts`

**Steps:**

- [ ] 先写**失败的结构测试** `C:/Users/david/haoqi-online/tests/db/structure.test.ts`（断言 9 张表存在、关键约束生效）：
  ```ts
  import { describe, it, expect } from 'vitest';
  import { adminClient } from './helpers/clients';

  describe('阶段2 表结构', () => {
    const admin = adminClient();

    it('9 张表都存在且可查询', async () => {
      for (const t of [
        'profiles', 'Term', 'Course', 'CourseMembership',
        'ScheduleSlot', 'ScheduleChange', 'Post', 'PostAsset', 'Comment',
      ]) {
        const { error } = await admin.from(t).select('*').limit(0);
        expect(error, `表 ${t} 不可查询: ${error?.message}`).toBeNull();
      }
    });

    it('Term.is_active 至多一个 true（部分唯一索引）', async () => {
      const a = adminClient();
      const t1 = '00000000-0000-0000-0000-0000000000e1';
      const t2 = '00000000-0000-0000-0000-0000000000e2';
      await a.from('Term').insert({ id: t1, name: 'T1', starts_on: '2026-01-01', ends_on: '2026-06-01', is_active: true });
      const { error } = await a.from('Term').insert({ id: t2, name: 'T2', starts_on: '2026-07-01', ends_on: '2026-12-01', is_active: true });
      expect(error, '第二个 is_active=true 应被部分唯一索引拒绝').not.toBeNull();
      await a.from('Term').delete().in('id', [t1, t2]);
    });

    it('Post.space_type 只接受 course', async () => {
      const a = adminClient();
      const { error } = await a.from('Post').insert({
        id: '00000000-0000-0000-0000-0000000000ff',
        space_type: 'project', space_id: '00000000-0000-0000-0000-0000000000c1',
        title: 'x', author_id: '00000000-0000-0000-0000-0000000000t1', status: 'draft',
      });
      expect(error, 'space_type=project 应被 check 拒绝').not.toBeNull();
    });
  });
  ```

- [ ] 跑测试看它失败（表还不存在）：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/structure.test.ts
  ```
  期望：失败（表不存在 / 索引不存在）。

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621091000_tables.sql`，写入全部 9 张表（最小实现）：
  ```sql
  -- 阶段 2 / 迁移 02：9 张表结构（RLS 与触发器在后续迁移加）

  -- §5.2 profiles（= 领域 User）
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique,
    display_name text not null,
    avatar_url text,
    role text not null default 'student' check (role in ('student','teacher','admin')),
    account_status text not null default 'invited' check (account_status in ('invited','active','suspended')),
    bio text,
    roster_ref text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- §3.2 Term
  create table public."Term" (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    starts_on date not null,
    ends_on date not null check (ends_on >= starts_on),
    is_active boolean not null default false
  );
  create unique index term_one_active on public."Term"(is_active) where is_active;

  -- §3.3 Course
  create table public."Course" (
    id uuid primary key default gen_random_uuid(),
    term_id uuid not null references public."Term"(id),
    name text not null,
    short_name text,
    avatar_url text,
    description text,
    owner_id uuid not null references public.profiles(id),
    created_at timestamptz not null default now()
  );

  -- §3.4 CourseMembership
  create table public."CourseMembership" (
    course_id uuid not null references public."Course"(id),
    user_id uuid not null references public.profiles(id),
    role text not null default 'member' check (role in ('member','teacher','assistant')),
    created_at timestamptz not null default now(),
    primary key (course_id, user_id)
  );

  -- §3.5 ScheduleSlot
  create table public."ScheduleSlot" (
    id uuid primary key default gen_random_uuid(),
    term_id uuid not null references public."Term"(id),
    course_id uuid references public."Course"(id),
    weekday smallint not null check (weekday between 1 and 7),
    starts_at time not null,
    ends_at time not null check (ends_at > starts_at),
    slot_kind text not null check (slot_kind in ('required','large_elective','small_elective','free'))
  );

  -- §3.6 ScheduleChange
  create table public."ScheduleChange" (
    id uuid primary key default gen_random_uuid(),
    slot_id uuid not null references public."ScheduleSlot"(id),
    occurs_on date not null,
    change_type text not null check (change_type in ('location','time','cancelled','note')),
    message text not null,
    new_location text,
    new_starts_at time,
    new_ends_at time,
    published_by uuid not null references public.profiles(id),
    published_at timestamptz not null default now(),
    deleted_at timestamptz
  );

  -- §3.7 Post（space_type 本切片只放 course）
  create table public."Post" (
    id uuid primary key default gen_random_uuid(),
    space_type text not null check (space_type in ('course')),
    space_id uuid not null,
    title text not null,
    body_markdown text,
    author_id uuid not null references public.profiles(id),
    status text not null default 'draft' check (status in ('draft','published')),
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
  );
  create index post_space_published on public."Post"(space_id, published_at desc) where deleted_at is null;

  -- §3.8 PostAsset
  create table public."PostAsset" (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public."Post"(id) on delete cascade,
    storage_key text not null,
    asset_type text not null check (asset_type in ('image','pdf','document','spreadsheet','link')),
    sort_order int not null default 0,
    created_at timestamptz not null default now(),
    deleted_at timestamptz
  );

  -- §3.9 Comment
  create table public."Comment" (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public."Post"(id) on delete cascade,
    author_id uuid not null references public.profiles(id),
    body text not null,
    created_at timestamptz not null default now(),
    deleted_at timestamptz
  );
  ```

- [ ] 套用迁移并跑结构测试看通过：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset && npm run test -- tests/db/structure.test.ts
  ```
  期望：3 个测试全绿。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621091000_tables.sql tests/db/structure.test.ts && git commit -m "feat(db): 迁移 02 九张表结构 + 约束 + 索引

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 4：迁移 03——辅助函数（§3.0）+ 不可变列锁触发器（全部表）

按 §3.0 建 5 个 `SECURITY DEFINER` 加固函数，并为 `profiles/Post/Comment/PostAsset/ScheduleChange/CourseMembership` 建 BEFORE UPDATE 触发器锁死不可变列；为 `Post/profiles` 建 `updated_at` 维护 + `published_at` 据 status 维护；防孤儿课程触发器。脚手架 + 行为混合，先写触发器行为的失败测试。

满足：不变量 §3.11.6（author_id 不可篡改）、§3.11.9（角色不能自我提升 + 唯一 teacher 不可降级）、§3.11.11（不可变列触发器锁）、§3.11.12（SECURITY DEFINER 加固）；§6.6 I 多条。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621092000_functions_triggers.sql`
- Create: `C:/Users/david/haoqi-online/tests/db/triggers.test.ts`

**Steps:**

- [ ] 写**失败测试** `C:/Users/david/haoqi-online/tests/db/triggers.test.ts`（用 adminClient 直接 update，触发器应在 DB 层抛异常，service-role 也挡不住，因为是 BEFORE trigger raise）：
  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import { adminClient } from './helpers/clients';
  import { USERS, POSTS, COURSES } from './helpers/ids';

  const admin = adminClient();

  describe('阶段2 不可变列锁与触发器（DB 层）', () => {
    it('Post.author_id 被触发器冻结（即便 service-role 也拒）', async () => {
      const { error } = await admin.from('Post')
        .update({ author_id: USERS.studentA })
        .eq('id', POSTS.methodPub1);
      expect(error, 'author_id 应被 BEFORE UPDATE 触发器冻结').not.toBeNull();
    });

    it('Post 改 status=published 时 published_at 被触发器强制为 now()', async () => {
      // 把草稿置 published，published_at 即便不传也应被填上
      await admin.from('Post').update({ status: 'published' }).eq('id', POSTS.methodDraft);
      const { data } = await admin.from('Post').select('published_at,status').eq('id', POSTS.methodDraft).single();
      expect(data?.status).toBe('published');
      expect(data?.published_at).not.toBeNull();
      // 还原
      await admin.from('Post').update({ status: 'draft' }).eq('id', POSTS.methodDraft);
      const { data: d2 } = await admin.from('Post').select('published_at').eq('id', POSTS.methodDraft).single();
      expect(d2?.published_at).toBeNull();
    });

    it('ScheduleChange 除 deleted_at 外所有列冻结', async () => {
      const { error } = await admin.from('ScheduleChange')
        .update({ message: '被篡改' })
        .is('deleted_at', null)
        .eq('change_type', 'location');
      expect(error, '改 message 应被冻结触发器拒绝').not.toBeNull();
    });

    it('降级课程唯一 teacher 被拒（防孤儿课程）', async () => {
      const { error } = await admin.from('CourseMembership')
        .update({ role: 'member' })
        .eq('course_id', COURSES.city)
        .eq('user_id', USERS.teacherB);
      expect(error, '城市漫游唯一 teacher 降级应被拒').not.toBeNull();
    });
  });
  ```

- [ ] 跑测试看失败（无触发器，且无 seed 数据 → 多半因数据缺失/无触发器报错）：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/triggers.test.ts
  ```
  期望：失败。

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621092000_functions_triggers.sql`：
  ```sql
  -- 阶段 2 / 迁移 03：辅助函数（§3.0）+ 不可变列锁触发器

  -- ===== §3.0 辅助函数（SECURITY DEFINER 加固）=====
  create function public.auth_role() returns text language sql stable security definer
    set search_path = pg_catalog, public as $$
    select role from public.profiles where id = auth.uid()
  $$;

  create function public.is_admin() returns boolean language sql stable security definer
    set search_path = pg_catalog, public as $$
    select public.auth_role() = 'admin'
  $$;

  create function public.course_role(cid uuid) returns text language sql stable security definer
    set search_path = pg_catalog, public as $$
    select role from public."CourseMembership"
    where course_id = cid and user_id = auth.uid()
  $$;

  create function public.can_post_course(cid uuid) returns boolean language sql stable security definer
    set search_path = pg_catalog, public as $$
    select public.is_admin() or public.course_role(cid) in ('teacher','assistant')
  $$;

  create function public.post_is_readable(pid uuid) returns boolean language sql stable security definer
    set search_path = pg_catalog, public as $$
    select exists (
      select 1 from public."Post" p
      where p.id = pid
        and p.deleted_at is null
        and p.space_type = 'course'
        and (
          p.status = 'published'
          or p.author_id = auth.uid()
          or public.can_post_course(p.space_id)
        )
    )
  $$;

  -- 加固：execute 仅授 authenticated（撤销 public）
  revoke execute on function public.auth_role() from public;
  revoke execute on function public.is_admin() from public;
  revoke execute on function public.course_role(uuid) from public;
  revoke execute on function public.can_post_course(uuid) from public;
  revoke execute on function public.post_is_readable(uuid) from public;
  grant execute on function public.auth_role() to authenticated;
  grant execute on function public.is_admin() to authenticated;
  grant execute on function public.course_role(uuid) to authenticated;
  grant execute on function public.can_post_course(uuid) to authenticated;
  grant execute on function public.post_is_readable(uuid) to authenticated;

  -- ===== profiles：受限列触发器（§3.1）=====
  create function public.profiles_guard() returns trigger language plpgsql security definer
    set search_path = pg_catalog, public as $$
  begin
    if not public.is_admin() then
      if new.role is distinct from old.role
         or new.email is distinct from old.email
         or new.account_status is distinct from old.account_status
         or new.roster_ref is distinct from old.roster_ref then
        raise exception '只有 admin 能修改 role/email/account_status/roster_ref';
      end if;
    end if;
    new.updated_at := now();
    return new;
  end;
  $$;
  create trigger trg_profiles_guard before update on public.profiles
    for each row execute function public.profiles_guard();

  -- ===== Post：冻结列 + published_at 维护 + updated_at（§3.0/§3.7）=====
  create function public.post_guard() returns trigger language plpgsql
    set search_path = pg_catalog, public as $$
  begin
    if new.space_type is distinct from old.space_type
       or new.space_id is distinct from old.space_id
       or new.author_id is distinct from old.author_id
       or new.created_at is distinct from old.created_at then
      raise exception 'Post space_type/space_id/author_id/created_at 不可修改';
    end if;
    if new.status = 'published' and old.status is distinct from 'published' then
      new.published_at := now();
    elsif new.status = 'draft' then
      new.published_at := null;
    end if;
    new.updated_at := now();
    return new;
  end;
  $$;
  create trigger trg_post_guard before update on public."Post"
    for each row execute function public.post_guard();

  -- 插入时也据 status 设 published_at（seed 直接插 published 帖需有 published_at）
  create function public.post_insert_published_at() returns trigger language plpgsql
    set search_path = pg_catalog, public as $$
  begin
    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;
    return new;
  end;
  $$;
  create trigger trg_post_insert_pub before insert on public."Post"
    for each row execute function public.post_insert_published_at();

  -- ===== Comment：冻结 post_id/author_id/created_at（§3.9）=====
  create function public.comment_guard() returns trigger language plpgsql
    set search_path = pg_catalog, public as $$
  begin
    if new.post_id is distinct from old.post_id
       or new.author_id is distinct from old.author_id
       or new.created_at is distinct from old.created_at then
      raise exception 'Comment post_id/author_id/created_at 不可修改';
    end if;
    return new;
  end;
  $$;
  create trigger trg_comment_guard before update on public."Comment"
    for each row execute function public.comment_guard();

  -- ===== PostAsset：冻结 post_id（§3.8）=====
  create function public.postasset_guard() returns trigger language plpgsql
    set search_path = pg_catalog, public as $$
  begin
    if new.post_id is distinct from old.post_id then
      raise exception 'PostAsset post_id 不可修改';
    end if;
    return new;
  end;
  $$;
  create trigger trg_postasset_guard before update on public."PostAsset"
    for each row execute function public.postasset_guard();

  -- ===== ScheduleChange：除 deleted_at 外全部冻结（§3.6）=====
  create function public.schedulechange_guard() returns trigger language plpgsql
    set search_path = pg_catalog, public as $$
  begin
    if new.slot_id is distinct from old.slot_id
       or new.occurs_on is distinct from old.occurs_on
       or new.change_type is distinct from old.change_type
       or new.message is distinct from old.message
       or new.new_location is distinct from old.new_location
       or new.new_starts_at is distinct from old.new_starts_at
       or new.new_ends_at is distinct from old.new_ends_at
       or new.published_by is distinct from old.published_by
       or new.published_at is distinct from old.published_at then
      raise exception 'ScheduleChange 只能撤回（改 deleted_at），其余列不可改';
    end if;
    return new;
  end;
  $$;
  create trigger trg_schedulechange_guard before update on public."ScheduleChange"
    for each row execute function public.schedulechange_guard();

  -- ===== CourseMembership：冻结 course_id/user_id + 防孤儿课程（§3.4）=====
  create function public.membership_guard() returns trigger language plpgsql
    set search_path = pg_catalog, public as $$
  declare teacher_count int;
  begin
    if new.course_id is distinct from old.course_id
       or new.user_id is distinct from old.user_id then
      raise exception 'CourseMembership course_id/user_id 不可修改';
    end if;
    -- 若把唯一 teacher 降级，拒绝
    if old.role = 'teacher' and new.role <> 'teacher' then
      select count(*) into teacher_count from public."CourseMembership"
        where course_id = old.course_id and role = 'teacher';
      if teacher_count <= 1 then
        raise exception '不能降级课程的最后一名 teacher（防孤儿课程）';
      end if;
    end if;
    return new;
  end;
  $$;
  create trigger trg_membership_guard before update on public."CourseMembership"
    for each row execute function public.membership_guard();

  create function public.membership_delete_guard() returns trigger language plpgsql
    set search_path = pg_catalog, public as $$
  declare teacher_count int;
  begin
    if old.role = 'teacher' then
      select count(*) into teacher_count from public."CourseMembership"
        where course_id = old.course_id and role = 'teacher';
      if teacher_count <= 1 then
        raise exception '不能删除课程的最后一名 teacher（防孤儿课程）';
      end if;
    end if;
    return old;
  end;
  $$;
  create trigger trg_membership_delete_guard before delete on public."CourseMembership"
    for each row execute function public.membership_delete_guard();
  ```

- [ ] 套用迁移（触发器测试依赖 seed 数据，先确认迁移能套用，完整跑 triggers 测试放到 seed Task 后）：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功（migration 语法无误）。triggers.test.ts 此时仍会因 seed 数据缺失而部分失败——Task 14 统一跑全绿。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621092000_functions_triggers.sql tests/db/triggers.test.ts && git commit -m "feat(db): 迁移 03 辅助函数 + 不可变列锁触发器 + 防孤儿课程

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 5：迁移 04（A）——启用 RLS + profiles 策略（§3.1）

为全部 9 张表 `enable row level security`，并写 `profiles` 的 select/insert/update/delete 策略。先写 profiles 的负样本失败测试。

满足：不变量 §3.11.9、§3.11.10；§6.6 I「student update profiles set role='admin' 被拒」。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621093000_rls_enable.sql`
- Create: `C:/Users/david/haoqi-online/tests/db/rls_profiles.test.ts`

**Steps:**

- [ ] 写**失败测试** `C:/Users/david/haoqi-online/tests/db/rls_profiles.test.ts`：
  ```ts
  import { describe, it, expect } from 'vitest';
  import { asUser, anonClient, EMAILS } from './helpers/clients';
  import { USERS } from './helpers/ids';

  describe('§3.1 profiles RLS', () => {
    it('未登录读不到任何 profile（§3.11.10）', async () => {
      const { data } = await anonClient().from('profiles').select('id');
      expect(data ?? []).toHaveLength(0);
    });

    it('登录成员能读到全体展示信息', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data } = await c.from('profiles').select('id,display_name');
      expect((data ?? []).length).toBeGreaterThanOrEqual(2);
    });

    it('student 自提 admin 被拒（§6.6 I）', async () => {
      const c = await asUser(EMAILS.studentA);
      const { error } = await c.from('profiles')
        .update({ role: 'admin' }).eq('id', USERS.studentA);
      expect(error, 'student 改自己 role 必须被拒').not.toBeNull();
    });

    it('student 能改自己的 display_name/bio', async () => {
      const c = await asUser(EMAILS.studentA);
      const { error } = await c.from('profiles')
        .update({ display_name: '学生甲改名', bio: '你好' }).eq('id', USERS.studentA);
      expect(error).toBeNull();
    });

    it('student 改不了别人的 profile', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data } = await c.from('profiles')
        .update({ display_name: 'hack' }).eq('id', USERS.teacherA).select();
      expect(data ?? []).toHaveLength(0); // RLS using 过滤，0 行受影响
    });
  });
  ```

- [ ] 跑看失败：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/rls_profiles.test.ts
  ```
  期望：失败（RLS 未启用，student 能改 role）。

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621093000_rls_enable.sql`：
  ```sql
  -- 阶段 2 / 迁移 04A：启用 RLS（全表）+ profiles 策略

  alter table public.profiles enable row level security;
  alter table public."Term" enable row level security;
  alter table public."Course" enable row level security;
  alter table public."CourseMembership" enable row level security;
  alter table public."ScheduleSlot" enable row level security;
  alter table public."ScheduleChange" enable row level security;
  alter table public."Post" enable row level security;
  alter table public."PostAsset" enable row level security;
  alter table public."Comment" enable row level security;

  -- ===== §3.1 profiles =====
  -- select：任一登录成员可读
  create policy profiles_select on public.profiles
    for select to authenticated
    using (auth.uid() is not null);

  -- insert：仅 admin（普通用户不自助插入）
  create policy profiles_insert on public.profiles
    for insert to authenticated
    with check (public.is_admin());

  -- update：本人可改自己行（受限列由 trg_profiles_guard 触发器拦），或 admin 改任意
  create policy profiles_update on public.profiles
    for update to authenticated
    using (id = auth.uid() or public.is_admin())
    with check (id = auth.uid() or public.is_admin());

  -- delete：仅 admin
  create policy profiles_delete on public.profiles
    for delete to authenticated
    using (public.is_admin());
  ```

- [ ] 套用 + 跑 profiles 测试（seed 仍未就绪，部分依赖 seed 的用例会失败——本步只确认迁移语法与 RLS 启用无误，全绿留 Task 14）：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621093000_rls_enable.sql tests/db/rls_profiles.test.ts && git commit -m "feat(db): 迁移 04A 启用 RLS + profiles 策略

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 6：迁移 04（B）——Term / Course / ScheduleSlot 只读层策略（§3.2 / §3.3 / §3.5）

三张「公共只读层」表：全员可读，写仅 admin（Course 的 update 额外允许该课负责人）。先写失败测试。

满足：不变量 §3.11.2（课程实体永驻——普通成员无写权）；§6.6 D 的「没覆写 Course/ScheduleSlot」靠普通成员无写权兜底。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621093100_rls_readonly.sql`
- Create: `C:/Users/david/haoqi-online/tests/db/rls_readonly.test.ts`

**Steps:**

- [ ] 写**失败测试** `C:/Users/david/haoqi-online/tests/db/rls_readonly.test.ts`：
  ```ts
  import { describe, it, expect } from 'vitest';
  import { asUser, anonClient, EMAILS } from './helpers/clients';
  import { SLOTS } from './helpers/ids';

  describe('§3.2/3.3/3.5 只读层 RLS', () => {
    it('登录成员能读 Term/Course/ScheduleSlot', async () => {
      const c = await asUser(EMAILS.studentA);
      for (const t of ['Term', 'Course', 'ScheduleSlot']) {
        const { data, error } = await c.from(t).select('id');
        expect(error, t).toBeNull();
        expect((data ?? []).length, t).toBeGreaterThanOrEqual(1);
      }
    });

    it('未登录读不到 ScheduleSlot', async () => {
      const { data } = await anonClient().from('ScheduleSlot').select('id');
      expect(data ?? []).toHaveLength(0);
    });

    it('student 不能 UPDATE ScheduleSlot（调课不许改 slot，§3.5）', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data } = await c.from('ScheduleSlot')
        .update({ starts_at: '08:00' }).eq('id', SLOTS.methodMon).select();
      expect(data ?? []).toHaveLength(0);
    });

    it('teacher 也不能 UPDATE ScheduleSlot（必须走 ScheduleChange）', async () => {
      const c = await asUser(EMAILS.teacherA);
      const { data } = await c.from('ScheduleSlot')
        .update({ starts_at: '08:00' }).eq('id', SLOTS.methodMon).select();
      expect(data ?? []).toHaveLength(0);
    });
  });
  ```

- [ ] 跑看失败：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/rls_readonly.test.ts
  ```
  期望：失败（无策略 → select 读不到）。

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621093100_rls_readonly.sql`：
  ```sql
  -- 阶段 2 / 迁移 04B：Term / Course / ScheduleSlot 只读层策略

  -- ===== §3.2 Term =====
  create policy term_select on public."Term"
    for select to authenticated using (auth.uid() is not null);
  create policy term_insert on public."Term"
    for insert to authenticated with check (public.is_admin());
  create policy term_update on public."Term"
    for update to authenticated using (public.is_admin()) with check (public.is_admin());
  create policy term_delete on public."Term"
    for delete to authenticated using (public.is_admin());

  -- ===== §3.3 Course =====
  create policy course_select on public."Course"
    for select to authenticated using (auth.uid() is not null);
  create policy course_insert on public."Course"
    for insert to authenticated with check (public.is_admin());
  -- update：admin 或该课 teacher/assistant
  create policy course_update on public."Course"
    for update to authenticated
    using (public.is_admin() or public.course_role(id) in ('teacher','assistant'))
    with check (public.is_admin() or public.course_role(id) in ('teacher','assistant'));
  create policy course_delete on public."Course"
    for delete to authenticated using (public.is_admin());

  -- ===== §3.5 ScheduleSlot =====
  create policy slot_select on public."ScheduleSlot"
    for select to authenticated using (auth.uid() is not null);
  create policy slot_insert on public."ScheduleSlot"
    for insert to authenticated with check (public.is_admin());
  create policy slot_update on public."ScheduleSlot"
    for update to authenticated using (public.is_admin()) with check (public.is_admin());
  create policy slot_delete on public."ScheduleSlot"
    for delete to authenticated using (public.is_admin());
  ```

- [ ] 套用，确认迁移语法：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621093100_rls_readonly.sql tests/db/rls_readonly.test.ts && git commit -m "feat(db): 迁移 04B Term/Course/ScheduleSlot 只读层 RLS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 7：迁移 04（C）——CourseMembership 自我提权防护策略（§3.4）

select 全员可读；insert/update/delete 拆独立策略，仅 admin 或该课现有 teacher；`role` 合法性在 with check 校验。先写负样本失败测试（assistant 自提 teacher、member upsert 改 role）。

满足：不变量 §3.11.9（非课程 teacher 改不动 membership、assistant 不能管 membership）；§6.6 I「assistant 自提 teacher 被拒」。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621093200_rls_membership.sql`
- Create: `C:/Users/david/haoqi-online/tests/db/rls_membership.test.ts`

**Steps:**

- [ ] 写**失败测试** `C:/Users/david/haoqi-online/tests/db/rls_membership.test.ts`：
  ```ts
  import { describe, it, expect } from 'vitest';
  import { asUser, EMAILS } from './helpers/clients';
  import { USERS, COURSES } from './helpers/ids';

  describe('§3.4 CourseMembership 自我提权防护', () => {
    it('assistant 把自己升 teacher 被拒（§6.6 I）', async () => {
      const c = await asUser(EMAILS.assistantA);
      const { data, error } = await c.from('CourseMembership')
        .update({ role: 'teacher' })
        .eq('course_id', COURSES.method).eq('user_id', USERS.assistantA).select();
      // 要么 RLS using 过滤为 0 行，要么报错——两者都算「被拒」
      expect((data ?? []).length === 0 || error !== null).toBe(true);
    });

    it('member 用 upsert(insert on conflict) 改自己 role 被拒', async () => {
      const c = await asUser(EMAILS.studentA);
      const { error } = await c.from('CourseMembership')
        .upsert({ course_id: COURSES.method, user_id: USERS.studentA, role: 'teacher' });
      expect(error, 'member upsert 自提应被拒').not.toBeNull();
    });

    it('course teacher 能把一个 member 升 assistant', async () => {
      const c = await asUser(EMAILS.teacherA);
      const { error } = await c.from('CourseMembership')
        .update({ role: 'assistant' })
        .eq('course_id', COURSES.method).eq('user_id', USERS.studentB);
      expect(error).toBeNull();
      // 还原
      const admin = (await import('./helpers/clients')).adminClient();
      await admin.from('CourseMembership').update({ role: 'member' })
        .eq('course_id', COURSES.method).eq('user_id', USERS.studentB);
    });
  });
  ```

- [ ] 跑看失败：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/rls_membership.test.ts
  ```
  期望：失败。

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621093200_rls_membership.sql`：
  ```sql
  -- 阶段 2 / 迁移 04C：CourseMembership 自我提权防护（§3.4）
  -- 管成员仅限 admin 或该课现有 teacher（不复用 can_post_course，否则 assistant 能改）

  create policy membership_select on public."CourseMembership"
    for select to authenticated using (auth.uid() is not null);

  -- insert 与 update 拆独立策略，防 upsert 绕过
  create policy membership_insert on public."CourseMembership"
    for insert to authenticated
    with check (
      role in ('member','teacher','assistant')
      and (public.is_admin() or public.course_role(course_id) = 'teacher')
    );

  create policy membership_update on public."CourseMembership"
    for update to authenticated
    using (public.is_admin() or public.course_role(course_id) = 'teacher')
    with check (
      role in ('member','teacher','assistant')
      and (public.is_admin() or public.course_role(course_id) = 'teacher')
    );

  create policy membership_delete on public."CourseMembership"
    for delete to authenticated
    using (public.is_admin() or public.course_role(course_id) = 'teacher');
  ```

- [ ] 套用，确认迁移语法：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621093200_rls_membership.sql tests/db/rls_membership.test.ts && git commit -m "feat(db): 迁移 04C CourseMembership 自我提权防护 RLS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 8：迁移 04（D）——ScheduleChange 调课策略（§3.6）

select 全员可读未软删行；insert 要求 `published_by=auth.uid()` 且 `can_post_course(slot.course_id)`；update 仅作者/admin（配合 Task 4 冻结触发器实现「只能撤回」）；delete 仅 admin。先写负样本（teacher 篡改另一 teacher 调课 message）。

满足：不变量 §3.11.1（调课不覆写——只追加）、§3.11.6（published_by 不可伪造）；§6.6 D、I「teacher 篡改他人调课 message 被拒」。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621093300_rls_schedulechange.sql`
- Create: `C:/Users/david/haoqi-online/tests/db/rls_schedulechange.test.ts`

**Steps:**

- [ ] 写**失败测试** `C:/Users/david/haoqi-online/tests/db/rls_schedulechange.test.ts`：
  ```ts
  import { describe, it, expect } from 'vitest';
  import { asUser, anonClient, EMAILS } from './helpers/clients';
  import { SLOTS, CHANGES, USERS } from './helpers/ids';

  describe('§3.6 ScheduleChange 调课 RLS', () => {
    it('全员可读未软删调课', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data } = await c.from('ScheduleChange').select('id').is('deleted_at', null);
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it('未登录读不到调课', async () => {
      const { data } = await anonClient().from('ScheduleChange').select('id');
      expect(data ?? []).toHaveLength(0);
    });

    it('teacherA 能对自己负责课的 slot 发调课', async () => {
      const c = await asUser(EMAILS.teacherA);
      const { error } = await c.from('ScheduleChange').insert({
        slot_id: SLOTS.methodMon, occurs_on: '2026-06-22',
        change_type: 'note', message: '本周带伞', published_by: USERS.teacherA,
      });
      expect(error).toBeNull();
    });

    it('student 发调课被拒（无课程负责人身份）', async () => {
      const c = await asUser(EMAILS.studentA);
      const { error } = await c.from('ScheduleChange').insert({
        slot_id: SLOTS.methodMon, occurs_on: '2026-06-22',
        change_type: 'note', message: '冒充', published_by: USERS.studentA,
      });
      expect(error).not.toBeNull();
    });

    it('teacherB 篡改 teacherA 的调课 message 被拒（§6.6 I）', async () => {
      const c = await asUser(EMAILS.teacherB);
      const { data, error } = await c.from('ScheduleChange')
        .update({ message: '钓鱼横幅' }).eq('id', CHANGES.methodMonLocation).select();
      expect((data ?? []).length === 0 || error !== null).toBe(true);
    });

    it('teacherA 可撤回（软删）自己的调课', async () => {
      const c = await asUser(EMAILS.teacherA);
      const { error } = await c.from('ScheduleChange')
        .update({ deleted_at: new Date().toISOString() }).eq('id', CHANGES.methodMonLocation);
      expect(error).toBeNull();
      // 还原
      const admin = (await import('./helpers/clients')).adminClient();
      await admin.from('ScheduleChange').update({ deleted_at: null }).eq('id', CHANGES.methodMonLocation);
    });
  });
  ```

- [ ] 跑看失败：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/rls_schedulechange.test.ts
  ```
  期望：失败。

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621093300_rls_schedulechange.sql`：
  ```sql
  -- 阶段 2 / 迁移 04D：ScheduleChange 调课 RLS（§3.6）

  -- select：全员可读未软删行
  create policy schedulechange_select on public."ScheduleChange"
    for select to authenticated
    using (auth.uid() is not null and deleted_at is null);

  -- insert：published_by=auth.uid() 且对该 slot 的课程可发帖；slot_kind='free'(course_id null) 天然被挡
  create policy schedulechange_insert on public."ScheduleChange"
    for insert to authenticated
    with check (
      published_by = auth.uid()
      and exists (
        select 1 from public."ScheduleSlot" s
        where s.id = slot_id and public.can_post_course(s.course_id)
      )
    );

  -- update：作者本人或 admin（除 deleted_at 外列由 trg_schedulechange_guard 冻结 → 只能撤回）
  create policy schedulechange_update on public."ScheduleChange"
    for update to authenticated
    using (published_by = auth.uid() or public.is_admin())
    with check (published_by = auth.uid() or public.is_admin());

  -- delete：不开放前端物理删，仅 admin 兜底
  create policy schedulechange_delete on public."ScheduleChange"
    for delete to authenticated using (public.is_admin());
  ```

- [ ] 套用，确认迁移语法：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621093300_rls_schedulechange.sql tests/db/rls_schedulechange.test.ts && git commit -m "feat(db): 迁移 04D ScheduleChange 调课 RLS（追加不覆写）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 9：迁移 04（E）——Post 课程动态策略（§3.7）

select 用 §3.7 等价条件（草稿收口）；insert 仅课程负责人/admin；update 作者或负责人（冻结列靠 Task 4 触发器）；delete 仅 admin。先写负样本（anon 读不到 draft、service-role 能读、student 发 Post 被拒、studentB 读不到他课草稿）。

满足：不变量 §3.11.3、§3.11.4、§3.11.5、§3.11.7；§6.6 B、I「member 发 Post 被拒、anon 读不到 draft」。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621093400_rls_post.sql`
- Create: `C:/Users/david/haoqi-online/tests/db/rls_post.test.ts`

**Steps:**

- [ ] 写**失败测试** `C:/Users/david/haoqi-online/tests/db/rls_post.test.ts`：
  ```ts
  import { describe, it, expect } from 'vitest';
  import { asUser, anonClient, adminClient, EMAILS } from './helpers/clients';
  import { POSTS, COURSES, USERS } from './helpers/ids';

  describe('§3.7 Post RLS', () => {
    it('anon 读不到任何 Post', async () => {
      const { data } = await anonClient().from('Post').select('id');
      expect(data ?? []).toHaveLength(0);
    });

    it('service-role 能读到草稿帖（绕过 RLS）', async () => {
      const { data } = await adminClient().from('Post').select('id').eq('id', POSTS.methodDraft);
      expect((data ?? []).length).toBe(1);
    });

    it('学生读得到 published、读不到他课草稿（§6.6 B/I）', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data: pub } = await c.from('Post').select('id').eq('id', POSTS.methodPub1);
      expect((pub ?? []).length).toBe(1);
      const { data: draft } = await c.from('Post').select('id').eq('id', POSTS.methodDraft);
      expect(draft ?? []).toHaveLength(0);
    });

    it('同课 teacher 能看到本课草稿', async () => {
      const c = await asUser(EMAILS.teacherA);
      const { data } = await c.from('Post').select('id').eq('id', POSTS.methodDraft);
      expect((data ?? []).length).toBe(1);
    });

    it('student/member 发 Post 被拒（§6.6 I）', async () => {
      const c = await asUser(EMAILS.studentA);
      const { error } = await c.from('Post').insert({
        space_type: 'course', space_id: COURSES.method,
        title: '学生想发帖', author_id: USERS.studentA, status: 'published',
      });
      expect(error).not.toBeNull();
    });

    it('teacherA 能在自己负责课发 published Post', async () => {
      const c = await asUser(EMAILS.teacherA);
      const { data, error } = await c.from('Post').insert({
        space_type: 'course', space_id: COURSES.method,
        title: '老师测试帖', author_id: USERS.teacherA, status: 'published',
      }).select().single();
      expect(error).toBeNull();
      await adminClient().from('Post').delete().eq('id', data!.id);
    });
  });
  ```

- [ ] 跑看失败：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/rls_post.test.ts
  ```
  期望：失败。

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621093400_rls_post.sql`：
  ```sql
  -- 阶段 2 / 迁移 04E：Post RLS（§3.7，本切片只覆盖 course 空间）

  -- select：草稿收口（与 post_is_readable 等价，直接内联以走索引）
  create policy post_select on public."Post"
    for select to authenticated
    using (
      deleted_at is null and space_type = 'course' and (
        status = 'published'
        or author_id = auth.uid()
        or public.can_post_course(space_id)
      )
    );

  -- insert：仅课程负责人/admin；author_id=auth.uid()
  create policy post_insert on public."Post"
    for insert to authenticated
    with check (
      space_type = 'course'
      and author_id = auth.uid()
      and public.can_post_course(space_id)
    );

  -- update：作者或负责人（冻结列靠触发器；软删走置 deleted_at）
  create policy post_update on public."Post"
    for update to authenticated
    using (deleted_at is null and (author_id = auth.uid() or public.can_post_course(space_id)))
    with check (space_type = 'course' and public.can_post_course(space_id));

  -- delete：不开放前端物理删，仅 admin
  create policy post_delete on public."Post"
    for delete to authenticated using (public.is_admin());
  ```

- [ ] 套用，确认迁移语法：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621093400_rls_post.sql tests/db/rls_post.test.ts && git commit -m "feat(db): 迁移 04E Post RLS（草稿收口 + 仅负责人可发）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 10：迁移 04（F）——PostAsset 与 Comment 策略（§3.8 / §3.9）

PostAsset select/写复用 `post_is_readable` + `asset_type='image'`；Comment 全员可评（门槛=看得见此帖），冻结列靠 Task 4 触发器。先写负样本（草稿帖 PostAsset 对学生返回 0 行、用户改自己评论 post_id 被拒、软删评论后少一条）。

满足：不变量 §3.11.4、§3.11.5、§3.11.8；§6.6 C、I「草稿帖 PostAsset 学生读 0 行、改评论 post_id 被拒」。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621093500_rls_asset_comment.sql`
- Create: `C:/Users/david/haoqi-online/tests/db/rls_asset_comment.test.ts`

**Steps:**

- [ ] 写**失败测试** `C:/Users/david/haoqi-online/tests/db/rls_asset_comment.test.ts`：
  ```ts
  import { describe, it, expect } from 'vitest';
  import { asUser, adminClient, EMAILS } from './helpers/clients';
  import { POSTS, ASSETS, COMMENTS, USERS } from './helpers/ids';

  describe('§3.8 PostAsset / §3.9 Comment RLS', () => {
    it('草稿帖的 PostAsset 对学生 select 返回 0 行（§6.6 I）', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data } = await c.from('PostAsset').select('id').eq('id', ASSETS.methodDraftImg);
      expect(data ?? []).toHaveLength(0);
    });

    it('已发布帖的 PostAsset 学生能读', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data } = await c.from('PostAsset').select('id').eq('post_id', POSTS.methodPub2);
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it('学生能对可见已发布帖发评论（§6.6 C）', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data, error } = await c.from('Comment').insert({
        post_id: POSTS.methodPub1, author_id: USERS.studentA, body: '学生评论一条',
      }).select().single();
      expect(error).toBeNull();
      await adminClient().from('Comment').delete().eq('id', data!.id);
    });

    it('学生不能对看不见的草稿帖发评论', async () => {
      const c = await asUser(EMAILS.studentA);
      const { error } = await c.from('Comment').insert({
        post_id: POSTS.methodDraft, author_id: USERS.studentA, body: '不该能评',
      });
      expect(error).not.toBeNull();
    });

    it('用户改自己评论的 post_id 被拒（§6.6 I）', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data, error } = await c.from('Comment')
        .update({ post_id: POSTS.cityPub1 }).eq('id', COMMENTS.onMethodPub1ByStudentA).select();
      expect((data ?? []).length === 0 || error !== null).toBe(true);
    });

    it('软删一条评论后普通成员 select 少一条', async () => {
      const admin = adminClient();
      const before = await admin.from('Comment').insert({
        post_id: POSTS.methodPub1, author_id: USERS.studentA, body: '待软删',
      }).select().single();
      const c = await asUser(EMAILS.studentA);
      const { count: c1 } = await c.from('Comment').select('id', { count: 'exact', head: true }).eq('post_id', POSTS.methodPub1);
      await c.from('Comment').update({ deleted_at: new Date().toISOString() }).eq('id', before.data!.id);
      const { count: c2 } = await c.from('Comment').select('id', { count: 'exact', head: true }).eq('post_id', POSTS.methodPub1);
      expect(c2!).toBe(c1! - 1);
      await admin.from('Comment').delete().eq('id', before.data!.id);
    });
  });
  ```

- [ ] 跑看失败：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/rls_asset_comment.test.ts
  ```
  期望：失败。

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621093500_rls_asset_comment.sql`：
  ```sql
  -- 阶段 2 / 迁移 04F：PostAsset（§3.8）+ Comment（§3.9）RLS

  -- ===== §3.8 PostAsset =====
  create policy postasset_select on public."PostAsset"
    for select to authenticated
    using (deleted_at is null and public.post_is_readable(post_id));

  create policy postasset_insert on public."PostAsset"
    for insert to authenticated
    with check (
      asset_type = 'image'
      and exists (
        select 1 from public."Post" p
        where p.id = post_id
          and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
      )
    );

  create policy postasset_update on public."PostAsset"
    for update to authenticated
    using (
      exists (select 1 from public."Post" p
              where p.id = post_id
                and (p.author_id = auth.uid() or public.can_post_course(p.space_id)))
    )
    with check (
      asset_type = 'image'
      and exists (select 1 from public."Post" p
                  where p.id = post_id
                    and (p.author_id = auth.uid() or public.can_post_course(p.space_id)))
    );

  create policy postasset_delete on public."PostAsset"
    for delete to authenticated using (public.is_admin());

  -- ===== §3.9 Comment =====
  create policy comment_select on public."Comment"
    for select to authenticated
    using (deleted_at is null and public.post_is_readable(post_id));

  -- insert：门槛=看得见此帖 + author_id=auth.uid()
  create policy comment_insert on public."Comment"
    for insert to authenticated
    with check (author_id = auth.uid() and public.post_is_readable(post_id));

  -- update：作者本人（冻结 post_id/author_id/created_at 靠触发器）或 admin（软删他人）
  create policy comment_update on public."Comment"
    for update to authenticated
    using (author_id = auth.uid() or public.is_admin())
    with check (author_id = auth.uid() or public.is_admin());

  -- delete：仅 admin 兜底物理删
  create policy comment_delete on public."Comment"
    for delete to authenticated using (public.is_admin());
  ```

- [ ] 套用，确认迁移语法：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621093500_rls_asset_comment.sql tests/db/rls_asset_comment.test.ts && git commit -m "feat(db): 迁移 04F PostAsset + Comment RLS（继承父帖可见性）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 11：迁移 05——Storage bucket `post-assets` 私有 + storage.objects RLS（§3.10）

建私有 bucket，写 path→postId 解析函数，SELECT 复用 `post_is_readable`，写策略要求 `can_post_course`。先写负样本（学生 anon 直接列他人草稿帖图片对象返回 0 行）。

满足：不变量 §3.11.8（Storage 对象受 post_is_readable 约束）；§6.6 I「学生 anon key 请求他人草稿帖图片被拒」。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/migrations/20260621094000_storage.sql`
- Create: `C:/Users/david/haoqi-online/tests/db/storage_rls.test.ts`

**Steps:**

- [ ] 写**失败测试** `C:/Users/david/haoqi-online/tests/db/storage_rls.test.ts`（storage_key 约定 `posts/{postId}/{uuid}.jpg`，故 path 第二段=postId）：
  ```ts
  import { describe, it, expect } from 'vitest';
  import { asUser, anonClient, adminClient, EMAILS } from './helpers/clients';
  import { POSTS } from './helpers/ids';

  const BUCKET = 'post-assets';

  describe('§3.10 Storage 对象 RLS', () => {
    it('bucket post-assets 存在且为私有', async () => {
      const { data } = await adminClient().storage.getBucket(BUCKET);
      expect(data?.public).toBe(false);
    });

    it('未登录列不出任何对象', async () => {
      const { data } = await anonClient().storage.from(BUCKET).list(`posts/${POSTS.methodPub2}`);
      expect(data ?? []).toHaveLength(0);
    });

    it('学生列得到已发布帖的图，列不到草稿帖的图（§6.6 I）', async () => {
      const c = await asUser(EMAILS.studentA);
      const pub = await c.storage.from(BUCKET).list(`posts/${POSTS.methodPub2}`);
      expect((pub.data ?? []).length).toBeGreaterThanOrEqual(1);
      const draft = await c.storage.from(BUCKET).list(`posts/${POSTS.methodDraft}`);
      expect(draft.data ?? []).toHaveLength(0);
    });

    it('学生对草稿帖图 createSignedUrl 失败（§6.6 I 安全负样本）', async () => {
      const c = await asUser(EMAILS.studentA);
      const { data, error } = await c.storage.from(BUCKET)
        .createSignedUrl(`posts/${POSTS.methodDraft}/draft.jpg`, 60);
      expect(data?.signedUrl == null || error !== null).toBe(true);
    });
  });
  ```

- [ ] 跑看失败：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/storage_rls.test.ts
  ```
  期望：失败（bucket 不存在）。

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/migrations/20260621094000_storage.sql`：
  ```sql
  -- 阶段 2 / 迁移 05：Storage bucket post-assets（私有）+ storage.objects RLS（§3.10）

  -- 私有 bucket（幂等）
  insert into storage.buckets (id, name, public)
  values ('post-assets', 'post-assets', false)
  on conflict (id) do update set public = false;

  -- 从对象 path 解析 postId：storage_key 约定 posts/{postId}/{uuid}.jpg → 第 2 段
  create function public.storage_post_id(object_name text) returns uuid
    language sql immutable
    set search_path = pg_catalog, public as $$
    select nullif((string_to_array(object_name, '/'))[2], '')::uuid
  $$;
  revoke execute on function public.storage_post_id(text) from public;
  grant execute on function public.storage_post_id(text) to authenticated;

  -- SELECT：复用 post_is_readable（草稿仅作者/负责人/admin 可读）
  create policy post_assets_read on storage.objects
    for select to authenticated
    using (
      bucket_id = 'post-assets'
      and public.post_is_readable(public.storage_post_id(name))
    );

  -- INSERT/UPDATE/DELETE：要求对该 post 的课程 can_post_course
  create policy post_assets_insert on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'post-assets'
      and exists (
        select 1 from public."Post" p
        where p.id = public.storage_post_id(name)
          and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
      )
    );

  create policy post_assets_update on storage.objects
    for update to authenticated
    using (
      bucket_id = 'post-assets'
      and exists (
        select 1 from public."Post" p
        where p.id = public.storage_post_id(name)
          and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
      )
    );

  create policy post_assets_delete on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'post-assets'
      and exists (
        select 1 from public."Post" p
        where p.id = public.storage_post_id(name)
          and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
      )
    );
  ```

- [ ] 套用，确认迁移语法：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功。注：storage list/signed URL 测试需 seed 里真把对象放进 bucket（Task 13 处理），全绿留 Task 14。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/migrations/20260621094000_storage.sql tests/db/storage_rls.test.ts && git commit -m "feat(db): 迁移 05 Storage 私有 bucket + 对象 RLS（草稿图不泄露）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 12：种子数据（A）——auth 用户 + profiles + Term + Course + Membership + ScheduleSlot + ScheduleChange

写 `supabase/seed.sql` 的身份与课表部分：6 个带密码 auth 用户（供测试 `signInWithPassword`）、对应 profiles、1 学期、2 门课、成员关系、课表时段、≥1 条调课。脚手架任务（执行 + reset 验证）。

满足：§6.6 D 调课预置；为所有 RLS 测试提供身份与课程数据。

**Files:**
- Create: `C:/Users/david/haoqi-online/supabase/seed.sql`

**Steps:**

- [ ] 创建 `C:/Users/david/haoqi-online/supabase/seed.sql`（第一部分，身份+课表；UUID 与 `tests/db/helpers/ids.ts` 完全一致）：
  ```sql
  -- 阶段 2 种子（A）：auth 用户 + profiles + Term + Course + Membership + Slot + Change
  -- UUID 与 tests/db/helpers/ids.ts 一一对应，改一处必须同步改另一处。
  -- 测试账号密码统一 haoqi-test-pw-0621（仅本地测试用）。

  -- ===== auth.users（带密码，供测试 signInWithPassword）=====
  -- crypt 来自 pgcrypto；email_confirmed_at 置非空以允许密码登录。
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  values
    ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@haoqi.test',      crypt('haoqi-test-pw-0621', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
    ('00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','teacher-a@haoqi.test',  crypt('haoqi-test-pw-0621', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
    ('00000000-0000-0000-0000-0000000000t2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','teacher-b@haoqi.test',  crypt('haoqi-test-pw-0621', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
    ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','assistant-a@haoqi.test',crypt('haoqi-test-pw-0621', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
    ('00000000-0000-0000-0000-0000000000s1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','student-a@haoqi.test',  crypt('haoqi-test-pw-0621', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
    ('00000000-0000-0000-0000-0000000000s2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','student-b@haoqi.test',  crypt('haoqi-test-pw-0621', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}');

  -- auth.identities（密码登录需要 email identity 行）
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','{"sub":"00000000-0000-0000-0000-0000000000a1","email":"admin@haoqi.test"}','email',now(),now(),now()),
    (gen_random_uuid(),'00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-0000000000t1','{"sub":"00000000-0000-0000-0000-0000000000t1","email":"teacher-a@haoqi.test"}','email',now(),now(),now()),
    (gen_random_uuid(),'00000000-0000-0000-0000-0000000000t2','00000000-0000-0000-0000-0000000000t2','{"sub":"00000000-0000-0000-0000-0000000000t2","email":"teacher-b@haoqi.test"}','email',now(),now(),now()),
    (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a2','{"sub":"00000000-0000-0000-0000-0000000000a2","email":"assistant-a@haoqi.test"}','email',now(),now(),now()),
    (gen_random_uuid(),'00000000-0000-0000-0000-0000000000s1','00000000-0000-0000-0000-0000000000s1','{"sub":"00000000-0000-0000-0000-0000000000s1","email":"student-a@haoqi.test"}','email',now(),now(),now()),
    (gen_random_uuid(),'00000000-0000-0000-0000-0000000000s2','00000000-0000-0000-0000-0000000000s2','{"sub":"00000000-0000-0000-0000-0000000000s2","email":"student-b@haoqi.test"}','email',now(),now(),now());

  -- ===== profiles =====
  insert into public.profiles (id, email, display_name, role, account_status) values
    ('00000000-0000-0000-0000-0000000000a1','admin@haoqi.test','管理员','admin','active'),
    ('00000000-0000-0000-0000-0000000000t1','teacher-a@haoqi.test','钱老师','teacher','active'),
    ('00000000-0000-0000-0000-0000000000t2','teacher-b@haoqi.test','孙老师','teacher','active'),
    ('00000000-0000-0000-0000-0000000000a2','assistant-a@haoqi.test','助教阿岩','student','active'),
    ('00000000-0000-0000-0000-0000000000s1','student-a@haoqi.test','林元','student','active'),
    ('00000000-0000-0000-0000-0000000000s2','student-b@haoqi.test','周舟','student','active');

  -- ===== Term（1 学期，active）=====
  insert into public."Term" (id, name, starts_on, ends_on, is_active) values
    ('00000000-0000-0000-0000-0000000000e1','2026 春季','2026-03-01','2026-07-10', true);

  -- ===== Course（2 门）=====
  insert into public."Course" (id, term_id, name, short_name, description, owner_id) values
    ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000e1','问题与方法','问法','学会问对的问题。','00000000-0000-0000-0000-0000000000t1'),
    ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000e1','城市漫游','漫游','带着问题走进城市。','00000000-0000-0000-0000-0000000000t2');

  -- ===== CourseMembership =====
  insert into public."CourseMembership" (course_id, user_id, role) values
    ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000t1','teacher'),
    ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a2','assistant'),
    ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000s1','member'),
    ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000s2','member'),
    ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000t2','teacher'),
    ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000s1','member');

  -- ===== ScheduleSlot（含一个 free 留白时段，course_id null）=====
  insert into public."ScheduleSlot" (id, term_id, course_id, weekday, starts_at, ends_at, slot_kind) values
    ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1',1,'09:00','10:30','required'),
    ('00000000-0000-0000-0000-00000000005b','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c2',3,'14:00','15:30','large_elective'),
    ('00000000-0000-0000-0000-00000000005c','00000000-0000-0000-0000-0000000000e1', null,                                  5,'16:00','17:00','free');

  -- ===== ScheduleChange（≥1 条；teacherA 对问法周一课调地点）=====
  insert into public."ScheduleChange" (id, slot_id, occurs_on, change_type, message, new_location, published_by) values
    ('00000000-0000-0000-0000-0000000000a9','00000000-0000-0000-0000-00000000005a','2026-06-22','location','本周一「问题与方法」改到三楼工坊。','三楼工坊','00000000-0000-0000-0000-0000000000t1');
  ```

- [ ] 套用并验证 seed 灌入成功：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset
  ```
  期望：reset 成功，无外键/约束/触发器报错（尤其防孤儿课程触发器在 insert 阶段不应触发）。

- [ ] 跑此前依赖身份/课表的测试看转绿：
  ```bash
  cd "C:/Users/david/haoqi-online" && npm run test -- tests/db/rls_profiles.test.ts tests/db/rls_readonly.test.ts tests/db/rls_membership.test.ts tests/db/rls_schedulechange.test.ts
  ```
  期望：这四个文件全绿。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/seed.sql && git commit -m "feat(db): seed A 身份 + 学期 + 课程 + 成员 + 课表 + 调课

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 13：种子数据（B）——Post + PostAsset + Comment + Storage 对象文件

追加 seed：每课若干 published Post、≥1 条 draft Post、PostAsset 图片记录、若干 Comment，并把图片对象真写进 `storage.objects`（让 Storage RLS 测试有对象可列）。脚手架任务。

满足：§6.6 B 核心闭环预置、§6.6 C 评论、§3.11.5/8；Storage 测试的数据前提。

**Files:**
- Modify: `C:/Users/david/haoqi-online/supabase/seed.sql`

**Steps:**

- [ ] 在 `C:/Users/david/haoqi-online/supabase/seed.sql` 末尾追加 Post/PostAsset/Comment 与 Storage 对象（published_at 由触发器在插入时补；draft 帖留空）：
  ```sql
  -- 阶段 2 种子（B）：Post + PostAsset + Comment + Storage 对象

  -- ===== Post（每课 published + 问法 1 条 draft）=====
  insert into public."Post" (id, space_type, space_id, title, body_markdown, author_id, status, created_at) values
    ('00000000-0000-0000-0000-0000000000p1','course','00000000-0000-0000-0000-0000000000c1','第一周：我们为什么要问问题','## 开场\n带着一个真问题来上课。','00000000-0000-0000-0000-0000000000t1','published','2026-06-18 09:00+08'),
    ('00000000-0000-0000-0000-0000000000p2','course','00000000-0000-0000-0000-0000000000c1','田野记录：菜市场的三个发现','配图见下，横滑看。','00000000-0000-0000-0000-0000000000t1','published','2026-06-19 09:00+08'),
    ('00000000-0000-0000-0000-0000000000p3','course','00000000-0000-0000-0000-0000000000c1','【草稿】下周提纲（未发布）','还在写，先存草稿。','00000000-0000-0000-0000-0000000000t1','draft','2026-06-20 09:00+08'),
    ('00000000-0000-0000-0000-0000000000p4','course','00000000-0000-0000-0000-0000000000c2','漫游路线：从老城门到河岸','这周沿河走。','00000000-0000-0000-0000-0000000000t2','published','2026-06-19 14:00+08');

  -- ===== PostAsset（仅 image；含一张草稿帖的图作负样本）=====
  insert into public."PostAsset" (id, post_id, storage_key, asset_type, sort_order) values
    ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000p2','posts/00000000-0000-0000-0000-0000000000p2/img1.jpg','image',0),
    ('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000p2','posts/00000000-0000-0000-0000-0000000000p2/img2.jpg','image',1),
    ('00000000-0000-0000-0000-0000000000f3','00000000-0000-0000-0000-0000000000p3','posts/00000000-0000-0000-0000-0000000000p3/draft.jpg','image',0);

  -- ===== Comment（若干；含 teacherA 与 studentA 各一条）=====
  insert into public."Comment" (id, post_id, author_id, body) values
    ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000p1','00000000-0000-0000-0000-0000000000s1','我想问的是：怎么判断一个问题值不值得问？'),
    ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000p1','00000000-0000-0000-0000-0000000000t1','好问题，我们下节课就从这切入。');

  -- ===== Storage 对象（让 Storage RLS 测试有对象可列；内容空占位）=====
  -- owner 置 service 灌入（null 即可，RLS 不依赖 owner，依赖 path→post_is_readable）
  insert into storage.objects (id, bucket_id, name, owner, metadata) values
    (gen_random_uuid(),'post-assets','posts/00000000-0000-0000-0000-0000000000p2/img1.jpg', null, '{"mimetype":"image/jpeg","size":1}'),
    (gen_random_uuid(),'post-assets','posts/00000000-0000-0000-0000-0000000000p2/img2.jpg', null, '{"mimetype":"image/jpeg","size":1}'),
    (gen_random_uuid(),'post-assets','posts/00000000-0000-0000-0000-0000000000p3/draft.jpg', null, '{"mimetype":"image/jpeg","size":1}');
  ```

- [ ] 套用并跑 Post/Asset/Comment/Storage 测试看转绿：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset && npm run test -- tests/db/rls_post.test.ts tests/db/rls_asset_comment.test.ts tests/db/storage_rls.test.ts
  ```
  期望：三个文件全绿。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add supabase/seed.sql && git commit -m "feat(db): seed B Post + PostAsset + Comment + Storage 对象

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

### Task 14：全量回归——所有集成测试一次跑绿 + 触发器/结构补绿 + npm script 固化

把全部 `tests/db/*.test.ts` 一次性跑绿（含 Task 4 的 triggers.test.ts 此时有 seed 数据），并在 `package.json` 固化 `test:db` 脚本，确保 CI 一条命令复现。脚手架 + 验证任务。

满足：§6.6 I 全量安全负样本进 CI；不变量 §3.11 全部测试覆盖闭环。

**Files:**
- Modify: `C:/Users/david/haoqi-online/package.json`
- Create: `C:/Users/david/haoqi-online/tests/db/README.md`

**Steps:**

- [ ] 在 `C:/Users/david/haoqi-online/package.json` 的 `scripts` 增加（如已有 `test` 则并存）：
  ```json
  "db:reset": "supabase db reset",
  "test:db": "vitest run tests/db"
  ```
  （手动编辑 scripts 块，保留已有键，不覆盖 `test`/`lint`/`build`。）

- [ ] 创建 `C:/Users/david/haoqi-online/tests/db/README.md`，写运行前置（让 CI/他人能复现）：
  ```markdown
  # 数据库集成测试（阶段 2）

  跑之前：
  1. 启动本地 Supabase：`npx supabase start`
  2. 套用迁移 + 种子：`npm run db:reset`
  3. 跑测试：`npm run test:db`

  测试连本地栈（`http://127.0.0.1:54321`），连接信息在 `.env.test.local`。
  测试账号密码统一 `haoqi-test-pw-0621`，账号见 `tests/db/helpers/clients.ts` 的 `EMAILS`。
  固定 UUID 见 `tests/db/helpers/ids.ts`，与 `supabase/seed.sql` 一一对应。
  ```

- [ ] reset 后跑**全部** db 测试看全绿：
  ```bash
  cd "C:/Users/david/haoqi-online" && npx supabase db reset && npm run test:db
  ```
  期望：`structure / triggers / rls_profiles / rls_readonly / rls_membership / rls_schedulechange / rls_post / rls_asset_comment / storage_rls` 全部 test 通过，0 失败。

- [ ] 若 triggers.test.ts 仍有用例失败，按 systematic-debugging 定位（多为 seed 数据 id 与 ids.ts 不一致 / published_at 触发器分支），修到全绿后再 commit。验证命令同上一步。

- [ ] commit：
  ```bash
  cd "C:/Users/david/haoqi-online" && git add package.json tests/db/README.md && git commit -m "test(db): 固化 test:db 脚本 + 全量集成测试回归绿

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

**阶段 2 产出清单（绝对路径）：**
- 迁移：`C:/Users/david/haoqi-online/supabase/migrations/20260621090000_extensions.sql` … `20260621094000_storage.sql`（共 9 个文件）
- 种子：`C:/Users/david/haoqi-online/supabase/seed.sql`
- 测试：`C:/Users/david/haoqi-online/tests/db/`（helpers + 9 个 `*.test.ts` + README）
- 环境/配置：`C:/Users/david/haoqi-online/.env.test.local`、`package.json`(scripts)、`.gitignore`

**对 spec §6.6 验收的覆盖映射：**
- B（草稿可见性核心闭环）→ Task 9、Task 13
- C（评论闭环）→ Task 10、Task 13
- D（调课不覆写）→ Task 8、Task 12（§3.11.1）
- I（安全负样本进 CI，全部）→ Task 5（自提 admin）、Task 7（assistant 自提 teacher / member upsert）、Task 8（teacher 篡改他人调课）、Task 9（member 发 Post）、Task 10（改评论 post_id / 草稿 PostAsset 0 行）、Task 11（草稿图 signed URL 被拒）
- 不变量 §3.11.1–12 → 分别落在 Task 3/4/5–11，Task 14 全量回归确认

**给整合者的两条衔接说明：**
1. 本阶段依赖阶段 1 已 `supabase init` 且 `package.json` 装好 `@supabase/supabase-js`、`vitest`、`dotenv`、`typescript`。若阶段 1 未装 `dotenv`，需在 Task 1 前补 `npm i -D dotenv`。
2. `lib/supabase/{client,server,admin}.ts`（共享背景里约定的客户端文件）属阶段 3 应用层，本阶段测试自带独立 client 工厂（`tests/db/helpers/clients.ts`），不依赖也不重复 `lib/supabase/*`，避免与后续阶段抢文件。

---

## 阶段 3：登录（魔法链接邀请制）+ 角色 + 花名册预置

> 本阶段实现 spec §5.1–§5.8 的登录态：`/login` 魔法链接页 + `/auth/callback` 回调、`middleware.ts` 路由保护（未登录跳登录、登录后回原意图页）、首次登录据 `roster` 建 profile 与角色就位（触发器在阶段 2 的 migration 里建，本阶段补「确认资料」流程与 §5.2 id 回填竞态的入口拦截）、读取当前用户与角色的 `lib/auth.ts`、§5.7 全部边界文案页。满足 **§6.6 验收 A** 全部 4 条。
>
> 前置假设（来自共享背景 + 阶段 1/2，本阶段不重复实现）：阶段 1 已建 Next 脚手架、`lib/supabase/{client,server,admin}.ts`、`app/globals.css`、`.env.example`、Vitest/Playwright 配置、`npm run {dev,build,lint,test,test:e2e}` 脚本；阶段 2 已建 `public.roster` / `public.profiles` 表 + RLS + `on auth.users insert` 触发器（§5.3 第 3 步据 `lower(trim(email))` 建 profile）+ §3.0 辅助函数 + `lib/types.ts`（含 Supabase 生成的 DB 类型）。本阶段若发现触发器/类型缺失，Task 1 会补齐迁移与类型别名所需的最小定义，不与阶段 2 冲突。
>
> 路径口径以 spec §4.1 为准：`app/`、`lib/`、`middleware.ts` 在仓库根（无 `src/`）。每个 Task 末尾 commit。分支：`feat/auth-magic-link`（从 `main` 切）。

---

### Task 1：分支与本阶段类型别名、roster/profiles 类型与 admin 邀请脚本依赖核对

确认本阶段所依赖的类型存在，补本阶段要用到的业务类型别名与一个最小测试夹具。脚手架性质，走「执行 + 明确验证」。

**Files:**
- Create: `lib/auth-types.ts`
- Modify: `package.json`（仅在缺 `tsx` 时加 devDependency，用于 Task 7 脚本）
- Test: 无（类型文件，由后续 `npm run build` 校验）

- [ ] 从 `main` 切分支：
  ```bash
  cd /c/Users/david/haoqi-online
  git checkout main && git pull
  git checkout -b feat/auth-magic-link
  ```
- [ ] 确认阶段 2 的触发器与表存在（只读核对，不改）：
  ```bash
  cd /c/Users/david/haoqi-online
  grep -rl "on auth.users" supabase/migrations/ || echo "MISSING_TRIGGER"
  grep -rl "create table public.roster\|create table \"roster\"\|public.roster" supabase/migrations/ || echo "MISSING_ROSTER"
  ```
  若任一输出 `MISSING_*`，停下并在 PR 描述里标注「依赖阶段 2 未就位」，但仍按本计划写代码（触发器由阶段 2 PR 提供，本阶段不重复建表）。
- [ ] 创建 `lib/auth-types.ts`（本阶段统一引用的业务类型别名，避免散落字面量）：
  ```ts
  // lib/auth-types.ts
  // 本阶段（登录 + 角色）统一引用的类型别名。字段权威定义见 spec §5.2。
  // 若 lib/types.ts 已由 Supabase 生成 Database 类型，这里只做窄化别名，不重复声明表结构。

  export type GlobalRole = 'student' | 'teacher' | 'admin';
  export type AccountStatus = 'invited' | 'active' | 'suspended';

  /** = public.profiles 行的应用层视图（仅本阶段需要的列）。 */
  export interface Profile {
    id: string;
    email: string | null;
    display_name: string;
    avatar_url: string | null;
    role: GlobalRole;
    account_status: AccountStatus;
    bio: string | null;
    roster_ref: string | null;
  }

  /** 当前登录态：auth 用户 + 其 profile（可能缺失 → account-not-provisioned）。 */
  export interface CurrentUser {
    authId: string;
    email: string | null;
    profile: Profile | null;
  }

  /** §5.7 登录页 / 拦截页的全部边界态枚举（URL ?error= 取值即用此联合）。 */
  export type AuthBoundary =
    | 'link-expired'
    | 'link-consumed'
    | 'link-cross-device'
    | 'callback-error'
    | 'no-permission'
    | 'account-not-provisioned'
    | 'not-in-roster';
  ```
- [ ] 确认 `tsx` 可用（Task 7 预置脚本用它跑 TS）；缺则装：
  ```bash
  cd /c/Users/david/haoqi-online
  node -e "require.resolve('tsx')" 2>/dev/null && echo "tsx OK" || npm install -D tsx
  ```
- [ ] 构建核对类型无误：
  ```bash
  cd /c/Users/david/haoqi-online && npm run build
  ```
- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add lib/auth-types.ts package.json package-lock.json
  git commit -m "chore(auth): 加阶段3登录用类型别名与tsx依赖核对

满足 spec §5.2 字段口径，为后续 auth 逻辑提供统一类型。"
  ```

**满足 spec：** §5.2 字段口径的应用层映射；为 §6.6 A 全链路提供类型地基。

---

### Task 2：`getCurrentUser()` 读当前用户 + 角色（先写失败测试）

`lib/auth.ts` 的 `getCurrentUser()`：用 `server.ts` 客户端取 auth 用户，再据 `auth.uid()` 取 profile，返回 `CurrentUser`。这是行为逻辑，走 TDD。

**Files:**
- Test: `lib/__tests__/auth.getCurrentUser.test.ts`

- [ ] 写失败测试 `lib/__tests__/auth.getCurrentUser.test.ts`：
  ```ts
  // lib/__tests__/auth.getCurrentUser.test.ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  // 被 mock 的 server 客户端工厂
  const getUserMock = vi.fn();
  const maybeSingleMock = vi.fn();

  vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => ({
      auth: { getUser: getUserMock },
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: maybeSingleMock }),
        }),
      }),
    })),
  }));

  import { getCurrentUser } from '@/lib/auth';

  beforeEach(() => {
    getUserMock.mockReset();
    maybeSingleMock.mockReset();
  });

  describe('getCurrentUser', () => {
    it('未登录返回 null', async () => {
      getUserMock.mockResolvedValue({ data: { user: null }, error: null });
      const u = await getCurrentUser();
      expect(u).toBeNull();
    });

    it('有 auth 用户且有 profile，返回拼好的 CurrentUser', async () => {
      getUserMock.mockResolvedValue({
        data: { user: { id: 'auth-1', email: 'a@b.com' } },
        error: null,
      });
      maybeSingleMock.mockResolvedValue({
        data: {
          id: 'auth-1',
          email: 'a@b.com',
          display_name: '林元',
          avatar_url: null,
          role: 'student',
          account_status: 'active',
          bio: null,
          roster_ref: 'G3-017',
        },
        error: null,
      });
      const u = await getCurrentUser();
      expect(u).not.toBeNull();
      expect(u!.authId).toBe('auth-1');
      expect(u!.email).toBe('a@b.com');
      expect(u!.profile?.role).toBe('student');
      expect(u!.profile?.account_status).toBe('active');
    });

    it('有 auth 用户但无 profile（触发器没匹配上），profile 为 null', async () => {
      getUserMock.mockResolvedValue({
        data: { user: { id: 'auth-2', email: 'x@y.com' } },
        error: null,
      });
      maybeSingleMock.mockResolvedValue({ data: null, error: null });
      const u = await getCurrentUser();
      expect(u).not.toBeNull();
      expect(u!.authId).toBe('auth-2');
      expect(u!.profile).toBeNull();
    });
  });
  ```
- [ ] 跑测试看它失败（`getCurrentUser` 尚不存在）：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/auth.getCurrentUser.test.ts
  ```
- [ ] commit（红）：
  ```bash
  cd /c/Users/david/haoqi-online
  git add lib/__tests__/auth.getCurrentUser.test.ts
  git commit -m "test(auth): getCurrentUser 失败用例（未登录/有profile/无profile）

对应 spec §5.3 读身份一律读 profiles。"
  ```

**满足 spec：** §5.3「代码读身份一律读 profiles（带 role）」；§4.3「默认全用 server.ts」。

---

### Task 3：`getCurrentUser()` 最小实现（让 Task 2 测试通过）

**Files:**
- Create: `lib/auth.ts`

- [ ] 写最小实现 `lib/auth.ts`：
  ```ts
  // lib/auth.ts
  // 取当前用户 + 角色封装（spec §4.1 / §5.3）。一律用 server.ts（受 RLS），不读 auth.users 私有字段。
  import 'server-only';
  import { createClient } from '@/lib/supabase/server';
  import type { CurrentUser, Profile } from '@/lib/auth-types';

  const PROFILE_COLUMNS =
    'id, email, display_name, avatar_url, role, account_status, bio, roster_ref';

  /**
   * 读当前登录用户与其 profile。
   * - 未登录 → null
   * - 已登录但触发器没建出 profile → { authId, email, profile: null }（入口拦截用，§5.7 account-not-provisioned）
   */
  export async function getCurrentUser(): Promise<CurrentUser | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();

    return {
      authId: user.id,
      email: user.email ?? null,
      profile: (profile as Profile | null) ?? null,
    };
  }
  ```
- [ ] 跑测试看通过：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/auth.getCurrentUser.test.ts
  ```
- [ ] commit（绿）：
  ```bash
  cd /c/Users/david/haoqi-online
  git add lib/auth.ts
  git commit -m "feat(auth): getCurrentUser 最小实现（server.ts + profiles）

spec §5.3 读身份读 profiles；未登录返回 null，有 auth 无 profile 时 profile=null。"
  ```

**满足 spec：** §5.3、§6.6 A 第 3 条「登录后读到角色」。

---

### Task 4：角色与状态守卫纯函数（先写失败测试）

把「该用户能不能进业务页 / 落到哪个边界」抽成纯函数，便于 middleware 与 shell layout 复用、可单测。逻辑判定，走 TDD。

**Files:**
- Test: `lib/__tests__/auth.guards.test.ts`

- [ ] 写失败测试 `lib/__tests__/auth.guards.test.ts`：
  ```ts
  // lib/__tests__/auth.guards.test.ts
  import { describe, it, expect } from 'vitest';
  import {
    isAdmin,
    isTeacher,
    resolveAccessBoundary,
  } from '@/lib/auth';
  import type { CurrentUser } from '@/lib/auth-types';

  function userWith(partial: Partial<CurrentUser['profile']> | null): CurrentUser {
    return {
      authId: 'auth-x',
      email: 'u@example.com',
      profile: partial
        ? {
            id: 'auth-x',
            email: 'u@example.com',
            display_name: '测试',
            avatar_url: null,
            role: 'student',
            account_status: 'active',
            bio: null,
            roster_ref: null,
            ...partial,
          }
        : null,
    };
  }

  describe('isAdmin / isTeacher', () => {
    it('admin', () => {
      expect(isAdmin(userWith({ role: 'admin' }))).toBe(true);
      expect(isTeacher(userWith({ role: 'admin' }))).toBe(false);
    });
    it('teacher', () => {
      expect(isTeacher(userWith({ role: 'teacher' }))).toBe(true);
      expect(isAdmin(userWith({ role: 'teacher' }))).toBe(false);
    });
    it('student / 无 profile 都不是 admin/teacher', () => {
      expect(isAdmin(userWith({ role: 'student' }))).toBe(false);
      expect(isAdmin(null as unknown as CurrentUser)).toBe(false);
      expect(isAdmin(userWith(null))).toBe(false);
    });
  });

  describe('resolveAccessBoundary', () => {
    it('未登录 → null（交给 middleware 跳登录）', () => {
      expect(resolveAccessBoundary(null)).toBeNull();
    });
    it('有 auth 无 profile → account-not-provisioned', () => {
      expect(resolveAccessBoundary(userWith(null))).toBe('account-not-provisioned');
    });
    it('suspended → no-permission', () => {
      expect(
        resolveAccessBoundary(userWith({ account_status: 'suspended' })),
      ).toBe('no-permission');
    });
    it('invited → onboarding（去确认资料）', () => {
      expect(resolveAccessBoundary(userWith({ account_status: 'invited' }))).toBe(
        'onboarding',
      );
    });
    it('active 且有 profile → ok', () => {
      expect(resolveAccessBoundary(userWith({ account_status: 'active' }))).toBe('ok');
    });
  });
  ```
- [ ] 跑测试看它失败（守卫函数尚不存在）：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/auth.guards.test.ts
  ```
- [ ] commit（红）：
  ```bash
  cd /c/Users/david/haoqi-online
  git add lib/__tests__/auth.guards.test.ts
  git commit -m "test(auth): 角色/状态守卫失败用例（admin/teacher/边界裁决）

对应 spec §5.3 异常分支 + §5.4 角色 + §5.7 边界态。"
  ```

**满足 spec：** §5.3 异常分支、§5.4 三角色、§5.7 状态清单。

---

### Task 5：守卫纯函数实现（让 Task 4 通过）

**Files:**
- Modify: `lib/auth.ts`

- [ ] 在 `lib/auth.ts` 末尾追加守卫函数（保留 Task 3 内容）。先在文件顶部已 import 的类型基础上，确保引入 `AuthBoundary`，把 import 行替换为：
  ```ts
  import type { CurrentUser, Profile, AuthBoundary } from '@/lib/auth-types';
  ```
- [ ] 在 `lib/auth.ts` 末尾追加：
  ```ts
  /** 全局 admin。null/无 profile 一律 false。 */
  export function isAdmin(user: CurrentUser | null): boolean {
    return user?.profile?.role === 'admin';
  }

  /** 全局 teacher（≠ 每门课都是老师，课内权限另看 CourseMembership，§5.4）。 */
  export function isTeacher(user: CurrentUser | null): boolean {
    return user?.profile?.role === 'teacher';
  }

  /**
   * 入口裁决：决定一个「已通过 auth」的用户该被放进业务页还是落到边界页。
   * 返回值含义（§5.3 异常分支 + §5.7）：
   *  - null                     未登录（交给 middleware 跳 /login，不在此处理）
   *  - 'account-not-provisioned' auth 有但 profile 无（email 大小写/空格不一致没匹配上 roster）
   *  - 'no-permission'           account_status = 'suspended'
   *  - 'onboarding'              account_status = 'invited'（去「确认资料」页）
   *  - 'ok'                      account_status = 'active'，放行
   */
  export type AccessDecision = AuthBoundary | 'onboarding' | 'ok' | null;

  export function resolveAccessBoundary(user: CurrentUser | null): AccessDecision {
    if (!user) return null;
    if (!user.profile) return 'account-not-provisioned';
    switch (user.profile.account_status) {
      case 'suspended':
        return 'no-permission';
      case 'invited':
        return 'onboarding';
      case 'active':
        return 'ok';
      default:
        return 'account-not-provisioned';
    }
  }
  ```
- [ ] 跑测试看通过：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/auth.guards.test.ts
  ```
- [ ] commit（绿）：
  ```bash
  cd /c/Users/david/haoqi-online
  git add lib/auth.ts
  git commit -m "feat(auth): isAdmin/isTeacher + resolveAccessBoundary 入口裁决

spec §5.3 异常分支落到 §5.7 各边界态；suspended→no-permission、invited→onboarding、有auth无profile→account-not-provisioned。"
  ```

**满足 spec：** §5.3、§5.4、§5.7；§6.6 A 第 4 条边界落位。

---

### Task 6：`middleware.ts` 刷新 session + 保护受限路由（先写失败测试）

middleware 负责：刷新 Supabase session（cookie）、未登录访问受保护路由跳 `/login?redirect=原意图路径`、已登录访问 `/login` 跳首页。判定逻辑抽成可单测的纯函数 `decideMiddlewareRedirect`，走 TDD；middleware 本体走「执行 + e2e 验证」（Task 13）。

**Files:**
- Create: `lib/middleware-logic.ts`
- Test: `lib/__tests__/middleware-logic.test.ts`

- [ ] 写失败测试 `lib/__tests__/middleware-logic.test.ts`：
  ```ts
  // lib/__tests__/middleware-logic.test.ts
  import { describe, it, expect } from 'vitest';
  import { decideMiddlewareRedirect } from '@/lib/middleware-logic';

  describe('decideMiddlewareRedirect', () => {
    it('未登录访问受保护页 /courses → 跳 /login 带 redirect', () => {
      const r = decideMiddlewareRedirect({ pathname: '/courses', hasSession: false });
      expect(r).toEqual({ redirectTo: '/login?redirect=%2Fcourses' });
    });

    it('未登录访问受保护首页 / → 跳 /login 带 redirect=%2F', () => {
      const r = decideMiddlewareRedirect({ pathname: '/', hasSession: false });
      expect(r).toEqual({ redirectTo: '/login?redirect=%2F' });
    });

    it('未登录访问带 query 的受保护页 → redirect 编码含 query', () => {
      const r = decideMiddlewareRedirect({
        pathname: '/courses/abc',
        search: '?tab=feed',
        hasSession: false,
      });
      expect(r).toEqual({ redirectTo: '/login?redirect=%2Fcourses%2Fabc%3Ftab%3Dfeed' });
    });

    it('未登录访问公开 /login → 放行', () => {
      const r = decideMiddlewareRedirect({ pathname: '/login', hasSession: false });
      expect(r).toEqual({ redirectTo: null });
    });

    it('未登录访问公开 /auth/callback → 放行（回调要先换 session）', () => {
      const r = decideMiddlewareRedirect({ pathname: '/auth/callback', hasSession: false });
      expect(r).toEqual({ redirectTo: null });
    });

    it('已登录访问 /login → 跳首页', () => {
      const r = decideMiddlewareRedirect({ pathname: '/login', hasSession: true });
      expect(r).toEqual({ redirectTo: '/' });
    });

    it('已登录访问 /login?redirect=%2Fcourses → 跳回 redirect 目标', () => {
      const r = decideMiddlewareRedirect({
        pathname: '/login',
        search: '?redirect=%2Fcourses',
        hasSession: true,
      });
      expect(r).toEqual({ redirectTo: '/courses' });
    });

    it('已登录访问受保护页 → 放行', () => {
      const r = decideMiddlewareRedirect({ pathname: '/courses', hasSession: true });
      expect(r).toEqual({ redirectTo: null });
    });

    it('open redirect 防护：redirect 指向外部绝对 URL → 忽略，回首页', () => {
      const r = decideMiddlewareRedirect({
        pathname: '/login',
        search: '?redirect=https%3A%2F%2Fevil.com',
        hasSession: true,
      });
      expect(r).toEqual({ redirectTo: '/' });
    });
  });
  ```
- [ ] 跑测试看它失败：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/middleware-logic.test.ts
  ```
- [ ] commit（红）：
  ```bash
  cd /c/Users/david/haoqi-online
  git add lib/__tests__/middleware-logic.test.ts
  git commit -m "test(auth): middleware 重定向判定失败用例（保护/回原意图/open-redirect防护）

对应 spec §6.6 A 第2条：未登录挡回登录、登录后回原意图页。"
  ```

**满足 spec：** §4.3「middleware 挡未登录是体验层」；§6.6 A 第 2 条。

---

### Task 7：`middleware-logic.ts` 实现（让 Task 6 通过）

**Files:**
- Create: `lib/middleware-logic.ts`

- [ ] 写实现 `lib/middleware-logic.ts`：
  ```ts
  // lib/middleware-logic.ts
  // 纯判定：给定路径 + 是否有 session，决定重定向目标。无副作用、可单测。
  // 真正刷新 session、读 cookie 在 middleware.ts 里做（Task 8）。

  /** 公开路由前缀：未登录可访问。其余一律需登录。 */
  const PUBLIC_PREFIXES = ['/login', '/auth/callback'];

  export interface MiddlewareInput {
    pathname: string;
    search?: string;
    hasSession: boolean;
  }

  export interface MiddlewareDecision {
    redirectTo: string | null;
  }

  function isPublic(pathname: string): boolean {
    return PUBLIC_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );
  }

  /** 只接受站内相对路径（以单个 '/' 开头、非 '//'），挡 open redirect。 */
  function safeInternalPath(raw: string | null): string | null {
    if (!raw) return null;
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return null;
    }
    if (!decoded.startsWith('/')) return null;
    if (decoded.startsWith('//')) return null;
    if (decoded.startsWith('/\\')) return null;
    return decoded;
  }

  export function decideMiddlewareRedirect(
    input: MiddlewareInput,
  ): MiddlewareDecision {
    const { pathname, search = '', hasSession } = input;
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

    // 已登录访问 /login：跳回 redirect 目标（若安全），否则首页。
    if (hasSession && (pathname === '/login' || pathname.startsWith('/login/'))) {
      const target = safeInternalPath(params.get('redirect'));
      return { redirectTo: target ?? '/' };
    }

    // 公开路由：放行。
    if (isPublic(pathname)) {
      return { redirectTo: null };
    }

    // 受保护路由 + 未登录：跳登录，带原意图（路径 + query）。
    if (!hasSession) {
      const intent = pathname + (search ? (search.startsWith('?') ? search : '?' + search) : '');
      const redirect = encodeURIComponent(intent);
      return { redirectTo: `/login?redirect=${redirect}` };
    }

    // 受保护路由 + 已登录：放行（业务态裁决由 shell layout 用 resolveAccessBoundary 做）。
    return { redirectTo: null };
  }
  ```
- [ ] 跑测试看通过：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/middleware-logic.test.ts
  ```
- [ ] commit（绿）：
  ```bash
  cd /c/Users/david/haoqi-online
  git add lib/middleware-logic.ts
  git commit -m "feat(auth): decideMiddlewareRedirect 纯判定（保护/回原意图/防open-redirect）

spec §6.6 A 第2条：未登录挡回 /login?redirect=原意图，登录后回原页。"
  ```

**满足 spec：** §6.6 A 第 2 条。

---

### Task 8：`middleware.ts` 本体（刷新 session + 应用判定）

把 Supabase SSR session 刷新与 Task 7 判定接到 Next middleware。�As 配置/集成性质，走「执行 + 明确验证（build 通过 + Task 13 e2e）」。

**Files:**
- Create: `middleware.ts`

- [ ] 写 `middleware.ts`（基于 `@supabase/ssr` 的标准 SSR session 刷新，叠加本地判定）：
  ```ts
  // middleware.ts
  // 刷新 Supabase session（cookie 往返）+ 保护受限路由（spec §4.3 / §6.6 A）。
  import { NextResponse, type NextRequest } from 'next/server';
  import { createServerClient } from '@supabase/ssr';
  import { decideMiddlewareRedirect } from '@/lib/middleware-logic';

  export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // 必须用 getUser（向 Auth 服务器校验），不能只信 cookie 里的 session。
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const decision = decideMiddlewareRedirect({
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
      hasSession: !!user,
    });

    if (decision.redirectTo) {
      const url = request.nextUrl.clone();
      const [path, query = ''] = decision.redirectTo.split('?');
      url.pathname = path;
      url.search = query ? '?' + query : '';
      const redirectResponse = NextResponse.redirect(url);
      // 把刷新过的 auth cookie 带到重定向响应上，避免丢 session。
      response.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value, c);
      });
      return redirectResponse;
    }

    return response;
  }

  export const config = {
    // 跳过静态资源与图片优化；其余路径都过 middleware。
    matcher: [
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
  };
  ```
- [ ] 构建核对（middleware 编译进 edge runtime 不报错）：
  ```bash
  cd /c/Users/david/haoqi-online && npm run build
  ```
- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add middleware.ts
  git commit -m "feat(auth): middleware 刷新 session + 保护受限路由

spec §4.3 middleware 为体验层；getUser 校验真身份；未登录跳 /login?redirect=，登录后访问 /login 跳回原意图。"
  ```

**满足 spec：** §4.3、§6.6 A 第 1、2 条（落首页 / 挡回登录）。

---

### Task 9：`/login` 魔法链接页（含 §5.7 全部状态）

`/login` 页：邮箱输入 + 发送魔法链接（CC，调 `client.ts` 的 `signInWithOtp`），按 URL `?error=` 渲染 §5.7 各边界文案，按 `?sent=` 渲染「已发送」态，按 `?redirect=` 透传原意图。CC 交互含三态。视觉移植走「执行 + 截图/e2e」，但 OTP 调用、状态机有逻辑——核心状态机抽纯函数单测，发送动作走 e2e。

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/login/LoginForm.tsx`
- Create: `app/(auth)/login/LoginForm.module.css`
- Create: `lib/login-copy.ts`
- Test: `lib/__tests__/login-copy.test.ts`

- [ ] 写失败测试 `lib/__tests__/login-copy.test.ts`（边界态 → 文案映射，纯函数）：
  ```ts
  // lib/__tests__/login-copy.test.ts
  import { describe, it, expect } from 'vitest';
  import { boundaryCopy, isKnownBoundary } from '@/lib/login-copy';

  describe('isKnownBoundary', () => {
    it('识别已知边界', () => {
      expect(isKnownBoundary('link-expired')).toBe(true);
      expect(isKnownBoundary('not-in-roster')).toBe(true);
      expect(isKnownBoundary('link-consumed')).toBe(true);
      expect(isKnownBoundary('link-cross-device')).toBe(true);
      expect(isKnownBoundary('callback-error')).toBe(true);
    });
    it('未知值返回 false', () => {
      expect(isKnownBoundary('lol')).toBe(false);
      expect(isKnownBoundary(null)).toBe(false);
    });
  });

  describe('boundaryCopy', () => {
    it('link-consumed 与 link-expired 文案不同（§5.7 必须区分）', () => {
      expect(boundaryCopy('link-consumed').title).not.toEqual(
        boundaryCopy('link-expired').title,
      );
    });
    it('not-in-roster 指向找管理员、且不可重发', () => {
      const c = boundaryCopy('not-in-roster');
      expect(c.title).toContain('名单');
      expect(c.canResend).toBe(false);
    });
    it('link-expired 可重发', () => {
      expect(boundaryCopy('link-expired').canResend).toBe(true);
    });
    it('每个边界都有非空 title 与 body', () => {
      (
        [
          'link-expired',
          'link-consumed',
          'link-cross-device',
          'callback-error',
          'not-in-roster',
        ] as const
      ).forEach((b) => {
        const c = boundaryCopy(b);
        expect(c.title.length).toBeGreaterThan(0);
        expect(c.body.length).toBeGreaterThan(0);
      });
    });
  });
  ```
- [ ] 跑测试看失败：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/login-copy.test.ts
  ```
- [ ] 写实现 `lib/login-copy.ts`：
  ```ts
  // lib/login-copy.ts
  // 登录页边界态 → 文案（spec §5.7 状态清单）。集中可审、可单测。

  export type LoginBoundary =
    | 'link-expired'
    | 'link-consumed'
    | 'link-cross-device'
    | 'callback-error'
    | 'not-in-roster';

  export interface BoundaryCopy {
    title: string;
    body: string;
    canResend: boolean; // 是否展示「重新发送」入口
  }

  const COPY: Record<LoginBoundary, BoundaryCopy> = {
    'link-expired': {
      title: '链接失效了',
      body: '这条登录链接已经过期。重新发一封，尽快点开。',
      canResend: true,
    },
    'link-consumed': {
      title: '这条链接已经用过了',
      body: '一条登录链接只能用一次（也可能被邮箱客户端自动预读消费了）。重新发一封新的。',
      canResend: true,
    },
    'link-cross-device': {
      title: '请在同一浏览器打开',
      body: '为了安全，请在「点发送的那台设备 / 那个浏览器」里打开链接，或在这里重新发送。',
      canResend: true,
    },
    'callback-error': {
      title: '登录没完成',
      body: '回调时出了点问题。可以重试，或联系管理员。',
      canResend: true,
    },
    'not-in-roster': {
      title: '这个邮箱不在好奇名单里',
      body: '好奇是邀请制社区，没有自助注册。请把这个邮箱发给管理员，让 TA 把你加进花名册。',
      canResend: false,
    },
  };

  const KNOWN = new Set<string>(Object.keys(COPY));

  export function isKnownBoundary(v: unknown): v is LoginBoundary {
    return typeof v === 'string' && KNOWN.has(v);
  }

  export function boundaryCopy(b: LoginBoundary): BoundaryCopy {
    return COPY[b];
  }
  ```
- [ ] 跑测试看通过：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/login-copy.test.ts
  ```
- [ ] 写 `app/(auth)/login/LoginForm.module.css`（移植原型纸感 token，颜色全引全局变量）：
  ```css
  /* app/(auth)/login/LoginForm.module.css */
  .wrap {
    max-width: 420px;
    margin: 8vh auto;
    padding: 32px 28px;
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: 0 2px 0 var(--line);
  }
  .brand {
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 4px;
  }
  .title {
    font-size: 22px;
    color: var(--ink);
    margin: 0 0 6px;
  }
  .sub {
    color: var(--ink);
    opacity: 0.7;
    font-size: 14px;
    margin: 0 0 20px;
  }
  .label {
    display: block;
    font-size: 13px;
    color: var(--ink);
    margin-bottom: 6px;
  }
  .input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--paper);
    font-size: 15px;
    color: var(--ink);
  }
  .input:focus {
    outline: 2px solid var(--blue);
    outline-offset: 1px;
  }
  .btn {
    width: 100%;
    margin-top: 16px;
    padding: 11px 12px;
    border: none;
    border-radius: 10px;
    background: var(--yellow);
    color: var(--ink);
    font-weight: 600;
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .note {
    margin-top: 14px;
    font-size: 13px;
    color: var(--ink);
    opacity: 0.7;
  }
  .banner {
    margin-bottom: 18px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid var(--coral);
    background: var(--paper);
    font-size: 14px;
  }
  .bannerTitle {
    font-weight: 600;
    color: var(--coral);
    margin-bottom: 2px;
  }
  .sent {
    margin-bottom: 18px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid var(--mint);
    background: var(--paper);
    font-size: 14px;
  }
  ```
- [ ] 写 `app/(auth)/login/LoginForm.tsx`（CC，含 loading/empty/error/sent 状态 + 重发冷却）：
  ```tsx
  // app/(auth)/login/LoginForm.tsx
  'use client';

  import { useState, useEffect } from 'react';
  import { createClient } from '@/lib/supabase/client';
  import { boundaryCopy, isKnownBoundary } from '@/lib/login-copy';
  import styles from './LoginForm.module.css';

  const RESEND_COOLDOWN_SEC = 30;

  export default function LoginForm({
    initialError,
    redirectTo,
  }: {
    initialError: string | null;
    redirectTo: string;
  }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>(
      'idle',
    );
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    const boundary = isKnownBoundary(initialError) ? boundaryCopy(initialError) : null;

    useEffect(() => {
      if (cooldown <= 0) return;
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }, [cooldown]);

    const trimmed = email.trim().toLowerCase();
    const canSend = trimmed.length > 3 && trimmed.includes('@') && status !== 'loading' && cooldown === 0;

    async function send() {
      if (!canSend) return;
      setStatus('loading');
      setErrorMsg(null);
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
        redirectTo,
      )}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo, shouldCreateUser: false },
      });
      if (error) {
        // shouldCreateUser:false 时陌生邮箱会报错 → 当作「不在名单」提示
        setStatus('error');
        setErrorMsg(
          '发送失败：这个邮箱可能不在名单里，或服务暂时不可用。确认邮箱无误后联系管理员。',
        );
        return;
      }
      setStatus('sent');
      setCooldown(RESEND_COOLDOWN_SEC);
    }

    return (
      <div className={styles.wrap}>
        <div className={styles.brand}>好奇学习社区</div>
        <h1 className={styles.title}>登录</h1>
        <p className={styles.sub}>输入花名册里的邮箱，我们给你发一条一次性登录链接。</p>

        {boundary && (
          <div className={styles.banner} role="alert">
            <div className={styles.bannerTitle}>{boundary.title}</div>
            <div>{boundary.body}</div>
          </div>
        )}

        {status === 'sent' ? (
          <div className={styles.sent} role="status">
            链接已发到 <strong>{trimmed}</strong>，去邮箱点开它（可能在垃圾箱）。
          </div>
        ) : null}

        <label className={styles.label} htmlFor="login-email">
          邮箱
        </label>
        <input
          id="login-email"
          className={styles.input}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="登录邮箱"
        />

        {status === 'error' && errorMsg ? (
          <p className={styles.note} role="alert" style={{ color: 'var(--coral)' }}>
            {errorMsg}
          </p>
        ) : null}

        <button
          className={styles.btn}
          onClick={send}
          disabled={!canSend}
          aria-label={cooldown > 0 ? `请等待 ${cooldown} 秒后重发` : '发送登录链接'}
        >
          {status === 'loading'
            ? '正在发送…'
            : cooldown > 0
              ? `重新发送（${cooldown}s）`
              : status === 'sent'
                ? '重新发送'
                : '发送登录链接'}
        </button>

        <p className={styles.note}>
          收不到信？检查垃圾箱，或把邮箱发给管理员手动开通。短信登录：规划中。
        </p>
      </div>
    );
  }
  ```
- [ ] 写 `app/(auth)/login/page.tsx`（SC：已登录在 middleware 已被跳走；这里读 `?error=`/`?redirect=` 传给表单）：
  ```tsx
  // app/(auth)/login/page.tsx
  import LoginForm from './LoginForm';

  export const dynamic = 'force-dynamic';

  export default async function LoginPage({
    searchParams,
  }: {
    searchParams: Promise<{ error?: string; redirect?: string }>;
  }) {
    const sp = await searchParams;
    const redirectTo = typeof sp.redirect === 'string' ? sp.redirect : '/';
    return (
      <main>
        <LoginForm initialError={sp.error ?? null} redirectTo={redirectTo} />
      </main>
    );
  }
  ```
- [ ] 构建核对：
  ```bash
  cd /c/Users/david/haoqi-online && npm run build
  ```
- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add "app/(auth)/login" lib/login-copy.ts lib/__tests__/login-copy.test.ts
  git commit -m "feat(auth): /login 魔法链接页 + §5.7 全状态文案

magic link 发送(shouldCreateUser:false 邀请制)+ loading/empty/error/sent/重发冷却；?error= 渲染 link-expired/consumed/cross-device/not-in-roster/callback-error 各文案；?redirect= 透传原意图。"
  ```

**满足 spec：** §5.1（邀请制 magic link）、§5.7 登录页状态清单、§6.6 A 第 4 条边界文案。

---

### Task 10：`/auth/callback` 回调路由（换 session + 区分链接边界）

`app/(auth)/auth/callback/route.ts`：用 PKCE code 换 session；成功后据 `?redirect=` 回原意图页（默认首页）；各类失败 redirect 到 `/login?error=...`（不抛 500）。判定「错误码 → 边界类型」的映射抽纯函数单测；route 本体走「执行 + e2e（Task 13）」。

**Files:**
- Create: `lib/callback-logic.ts`
- Create: `app/(auth)/auth/callback/route.ts`
- Test: `lib/__tests__/callback-logic.test.ts`

- [ ] 写失败测试 `lib/__tests__/callback-logic.test.ts`：
  ```ts
  // lib/__tests__/callback-logic.test.ts
  import { describe, it, expect } from 'vitest';
  import { classifyCallbackError, safeRedirectTarget } from '@/lib/callback-logic';

  describe('classifyCallbackError', () => {
    it('过期 → link-expired', () => {
      expect(classifyCallbackError('otp_expired', 'Token has expired')).toBe('link-expired');
      expect(classifyCallbackError('access_denied', 'Email link is invalid or has expired')).toBe(
        'link-expired',
      );
    });
    it('已用过 → link-consumed', () => {
      expect(classifyCallbackError('flow_state_not_found', '')).toBe('link-consumed');
      expect(classifyCallbackError(null, 'Code has already been used')).toBe('link-consumed');
    });
    it('PKCE/code verifier 不匹配（跨设备）→ link-cross-device', () => {
      expect(classifyCallbackError('validation_failed', 'code verifier')).toBe(
        'link-cross-device',
      );
      expect(classifyCallbackError('bad_code_verifier', '')).toBe('link-cross-device');
    });
    it('其它 → callback-error 兜底', () => {
      expect(classifyCallbackError('weird', 'who knows')).toBe('callback-error');
      expect(classifyCallbackError(null, null)).toBe('callback-error');
    });
  });

  describe('safeRedirectTarget', () => {
    it('站内相对路径放行', () => {
      expect(safeRedirectTarget('/courses')).toBe('/courses');
    });
    it('缺省 → /', () => {
      expect(safeRedirectTarget(null)).toBe('/');
      expect(safeRedirectTarget('')).toBe('/');
    });
    it('外部 URL / 协议相对 → 退回 /', () => {
      expect(safeRedirectTarget('https://evil.com')).toBe('/');
      expect(safeRedirectTarget('//evil.com')).toBe('/');
    });
  });
  ```
- [ ] 跑测试看失败：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/callback-logic.test.ts
  ```
- [ ] 写实现 `lib/callback-logic.ts`：
  ```ts
  // lib/callback-logic.ts
  // 回调错误归类（spec §5.3 异常分支 / §5.7），与 route 解耦便于单测。

  export type CallbackBoundary =
    | 'link-expired'
    | 'link-consumed'
    | 'link-cross-device'
    | 'callback-error';

  /** 据 Supabase 返回的 error_code / error_description 归类到 §5.7 边界。 */
  export function classifyCallbackError(
    code: string | null,
    description: string | null,
  ): CallbackBoundary {
    const c = (code ?? '').toLowerCase();
    const d = (description ?? '').toLowerCase();

    if (c === 'otp_expired' || d.includes('expired')) return 'link-expired';
    if (
      c === 'flow_state_not_found' ||
      d.includes('already been used') ||
      d.includes('already used')
    )
      return 'link-consumed';
    if (
      c === 'bad_code_verifier' ||
      d.includes('code verifier') ||
      d.includes('code_verifier')
    )
      return 'link-cross-device';
    return 'callback-error';
  }

  /** 只允许站内相对路径，挡 open redirect；缺省回首页。 */
  export function safeRedirectTarget(raw: string | null): string {
    if (!raw) return '/';
    if (!raw.startsWith('/')) return '/';
    if (raw.startsWith('//')) return '/';
    if (raw.startsWith('/\\')) return '/';
    return raw;
  }
  ```
- [ ] 跑测试看通过：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/callback-logic.test.ts
  ```
- [ ] 写 `app/(auth)/auth/callback/route.ts`：
  ```ts
  // app/(auth)/auth/callback/route.ts
  // magic link / PKCE 回调：换 session，成功回原意图页，失败 redirect /login?error=（绝不抛 500）。
  import { NextResponse, type NextRequest } from 'next/server';
  import { createServerClient } from '@supabase/ssr';
  import { classifyCallbackError, safeRedirectTarget } from '@/lib/callback-logic';

  export async function GET(request: NextRequest) {
    const url = request.nextUrl;
    const code = url.searchParams.get('code');
    const errorCode =
      url.searchParams.get('error_code') ?? url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    const redirectTo = safeRedirectTarget(url.searchParams.get('redirect'));

    // 链接里直接带了 error（过期/无效），不必尝试换码，直接归类。
    if (errorCode || errorDescription) {
      const boundary = classifyCallbackError(errorCode, errorDescription);
      return NextResponse.redirect(new URL(`/login?error=${boundary}`, url.origin));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=callback-error', url.origin));
    }

    let response = NextResponse.redirect(new URL(redirectTo, url.origin));
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const boundary = classifyCallbackError(error.code ?? null, error.message);
      return NextResponse.redirect(new URL(`/login?error=${boundary}`, url.origin));
    }

    // 成功：response 已带刷新后的 auth cookie，重定向到原意图页。
    return response;
  }
  ```
- [ ] 构建核对：
  ```bash
  cd /c/Users/david/haoqi-online && npm run build
  ```
- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add "app/(auth)/auth/callback/route.ts" lib/callback-logic.ts lib/__tests__/callback-logic.test.ts
  git commit -m "feat(auth): /auth/callback 换 session + 失败 redirect 带 error

exchangeCodeForSession 成功回 ?redirect 原意图(防 open redirect)；过期/已用/跨设备/其它失败 redirect /login?error= 各边界，不抛 500。"
  ```

**满足 spec：** §5.3 callback 出错 redirect 带 error、链接过期/已用/跨设备分支；§2.0 回调路由；§6.6 A 第 4 条。

---

### Task 11：`(shell)` 业务态拦截（suspended / 无 profile / onboarding）

登录后进 `(shell)` 区前，用 `getCurrentUser()` + `resolveAccessBoundary()` 决定放行 / 拦截 / 引导确认资料。这是把 §5.3 异常分支落到入口的关键。在 `(shell)/layout.tsx` 做服务端裁决；边界页是静态文案组件。

**Files:**
- Create: `app/(shell)/layout.tsx`
- Create: `app/(shell)/_auth/AccessGate.tsx`
- Create: `app/(shell)/_auth/BoundaryNotice.tsx`
- Create: `app/(shell)/_auth/BoundaryNotice.module.css`
- Create: `lib/access-copy.ts`
- Test: `lib/__tests__/access-copy.test.ts`

- [ ] 写失败测试 `lib/__tests__/access-copy.test.ts`：
  ```ts
  // lib/__tests__/access-copy.test.ts
  import { describe, it, expect } from 'vitest';
  import { accessCopy } from '@/lib/access-copy';

  describe('accessCopy', () => {
    it('no-permission（suspended）有停用说明 + 联系方式', () => {
      const c = accessCopy('no-permission');
      expect(c.title).toContain('停用');
      expect(c.body.length).toBeGreaterThan(0);
      expect(c.showContactAdmin).toBe(true);
    });
    it('account-not-provisioned 提示账号正在开通/名单不一致', () => {
      const c = accessCopy('account-not-provisioned');
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.body).toContain('名单');
      expect(c.showContactAdmin).toBe(true);
    });
    it('两种边界文案不同', () => {
      expect(accessCopy('no-permission').title).not.toEqual(
        accessCopy('account-not-provisioned').title,
      );
    });
  });
  ```
- [ ] 跑测试看失败：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/access-copy.test.ts
  ```
- [ ] 写实现 `lib/access-copy.ts`：
  ```ts
  // lib/access-copy.ts
  // 入口拦截页文案（spec §5.7 no-permission / account-not-provisioned）。
  export type AccessBoundaryKind = 'no-permission' | 'account-not-provisioned';

  export interface AccessCopy {
    title: string;
    body: string;
    showContactAdmin: boolean;
  }

  const COPY: Record<AccessBoundaryKind, AccessCopy> = {
    'no-permission': {
      title: '账号已被停用',
      body: '你的好奇账号当前被停用，暂时无法进入社区。如有疑问，请联系管理员核实。',
      showContactAdmin: true,
    },
    'account-not-provisioned': {
      title: '账号正在开通',
      body: '你已通过邮箱验证，但还没在好奇名单里就位——可能是邮箱与名单里的写法不一致。请把这个邮箱发给管理员核对。',
      showContactAdmin: true,
    },
  };

  export function accessCopy(kind: AccessBoundaryKind): AccessCopy {
    return COPY[kind];
  }
  ```
- [ ] 跑测试看通过：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/access-copy.test.ts
  ```
- [ ] 写 `app/(shell)/_auth/BoundaryNotice.module.css`：
  ```css
  /* app/(shell)/_auth/BoundaryNotice.module.css */
  .wrap {
    max-width: 480px;
    margin: 10vh auto;
    padding: 32px 28px;
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    text-align: center;
  }
  .title {
    font-size: 20px;
    color: var(--ink);
    margin: 0 0 10px;
  }
  .body {
    color: var(--ink);
    opacity: 0.8;
    font-size: 15px;
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  .link {
    display: inline-block;
    padding: 9px 16px;
    border-radius: 10px;
    border: 1px solid var(--line);
    color: var(--ink);
    text-decoration: none;
    font-size: 14px;
  }
  .primary {
    background: var(--yellow);
    border-color: var(--yellow);
  }
  ```
- [ ] 写 `app/(shell)/_auth/BoundaryNotice.tsx`（静态文案页组件）：
  ```tsx
  // app/(shell)/_auth/BoundaryNotice.tsx
  import { accessCopy, type AccessBoundaryKind } from '@/lib/access-copy';
  import styles from './BoundaryNotice.module.css';

  export default function BoundaryNotice({ kind }: { kind: AccessBoundaryKind }) {
    const c = accessCopy(kind);
    return (
      <main className={styles.wrap} role="alert">
        <h1 className={styles.title}>{c.title}</h1>
        <p className={styles.body}>{c.body}</p>
        <div className={styles.actions}>
          {c.showContactAdmin && (
            <a className={styles.link} href="mailto:admin@haoqi.community">
              联系管理员
            </a>
          )}
          <a className={`${styles.link} ${styles.primary}`} href="/login">
            回到登录
          </a>
        </div>
      </main>
    );
  }
  ```
- [ ] 写 `app/(shell)/_auth/AccessGate.tsx`（服务端裁决；非 ok 直接渲染拦截，ok 渲染 children）：
  ```tsx
  // app/(shell)/_auth/AccessGate.tsx
  import { redirect } from 'next/navigation';
  import { getCurrentUser, resolveAccessBoundary } from '@/lib/auth';
  import BoundaryNotice from './BoundaryNotice';

  export default async function AccessGate({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const user = await getCurrentUser();
    const decision = resolveAccessBoundary(user);

    // 未登录：middleware 一般已挡；双保险，回登录。
    if (decision === null) redirect('/login');
    // invited：去确认资料（Task 12 的 /onboarding）。
    if (decision === 'onboarding') redirect('/onboarding');
    if (decision === 'no-permission') return <BoundaryNotice kind="no-permission" />;
    if (decision === 'account-not-provisioned')
      return <BoundaryNotice kind="account-not-provisioned" />;

    // ok：放行。
    return <>{children}</>;
  }
  ```
- [ ] 写 `app/(shell)/layout.tsx`（包住所有业务页；外壳 Sidebar/Topbar 由其它阶段填，本阶段只放 AccessGate 与最小 main）：
  ```tsx
  // app/(shell)/layout.tsx
  // 登录后区外壳。本阶段只负责入口鉴权（AccessGate）；Sidebar/Topbar 由外壳阶段补。
  import AccessGate from './_auth/AccessGate';

  export default function ShellLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <AccessGate>
        <div data-shell-root>{children}</div>
      </AccessGate>
    );
  }
  ```
- [ ] 构建核对：
  ```bash
  cd /c/Users/david/haoqi-online && npm run build
  ```
- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add "app/(shell)/layout.tsx" "app/(shell)/_auth" lib/access-copy.ts lib/__tests__/access-copy.test.ts
  git commit -m "feat(auth): (shell) 入口鉴权 + suspended/无profile 拦截页

AccessGate 用 resolveAccessBoundary 裁决：suspended→停用页、有auth无profile→开通页、invited→/onboarding、active→放行；不放进任何业务页(§5.3)。"
  ```

**满足 spec：** §5.3 异常分支（suspended、auth有profile无）、§5.7 no-permission/account-not-provisioned；§6.6 A 第 4 条。

---

### Task 12：首次登录「确认资料」页 + 置 active（§5.3 第 5 步）

`invited` 用户被 AccessGate 引到 `/onboarding`：确认昵称、可上传头像（首切片头像上传 OUT，按 §4.4 只读；这里只让确认昵称/写 bio），角色只读展示。确认后 Server Action 写 `display_name/bio` 并置 `account_status='active'`。写库走 Server Action，有逻辑 → 处理竞态（§5.2 id 回填）的 profile 缺失保护单测。

**Files:**
- Create: `app/onboarding/page.tsx`
- Create: `app/onboarding/OnboardingForm.tsx`
- Create: `app/onboarding/OnboardingForm.module.css`
- Create: `app/onboarding/actions.ts`
- Test: `lib/__tests__/onboarding-validate.test.ts`
- Create: `lib/onboarding-validate.ts`

- [ ] 写失败测试 `lib/__tests__/onboarding-validate.test.ts`：
  ```ts
  // lib/__tests__/onboarding-validate.test.ts
  import { describe, it, expect } from 'vitest';
  import { validateOnboarding } from '@/lib/onboarding-validate';

  describe('validateOnboarding', () => {
    it('合法昵称通过，trim', () => {
      const r = validateOnboarding({ displayName: '  林元  ', bio: '你好' });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.display_name).toBe('林元');
        expect(r.value.bio).toBe('你好');
      }
    });
    it('空昵称被拒', () => {
      const r = validateOnboarding({ displayName: '   ', bio: '' });
      expect(r.ok).toBe(false);
    });
    it('昵称过长（>40）被拒', () => {
      const r = validateOnboarding({ displayName: 'x'.repeat(41), bio: '' });
      expect(r.ok).toBe(false);
    });
    it('bio 过长（>200）被拒', () => {
      const r = validateOnboarding({ displayName: '林元', bio: 'y'.repeat(201) });
      expect(r.ok).toBe(false);
    });
    it('空 bio 归一为 null', () => {
      const r = validateOnboarding({ displayName: '林元', bio: '   ' });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.bio).toBeNull();
    });
  });
  ```
- [ ] 跑测试看失败：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/onboarding-validate.test.ts
  ```
- [ ] 写实现 `lib/onboarding-validate.ts`：
  ```ts
  // lib/onboarding-validate.ts
  // 「确认资料」表单校验（spec §5.3 第5步：确认昵称，角色只读不改）。
  export interface OnboardingInput {
    displayName: string;
    bio: string;
  }
  export interface OnboardingValue {
    display_name: string;
    bio: string | null;
  }
  export type OnboardingResult =
    | { ok: true; value: OnboardingValue }
    | { ok: false; error: string };

  export function validateOnboarding(input: OnboardingInput): OnboardingResult {
    const name = input.displayName.trim();
    const bio = input.bio.trim();
    if (name.length === 0) return { ok: false, error: '昵称不能为空' };
    if (name.length > 40) return { ok: false, error: '昵称太长了（最多 40 字）' };
    if (bio.length > 200) return { ok: false, error: '签名太长了（最多 200 字）' };
    return { ok: true, value: { display_name: name, bio: bio.length ? bio : null } };
  }
  ```
- [ ] 跑测试看通过：
  ```bash
  cd /c/Users/david/haoqi-online && npx vitest run lib/__tests__/onboarding-validate.test.ts
  ```
- [ ] 写 `app/onboarding/actions.ts`（Server Action：校验 → 更新 profiles → 置 active；profile 缺失则跳开通拦截）：
  ```ts
  // app/onboarding/actions.ts
  'use server';

  import { redirect } from 'next/navigation';
  import { createClient } from '@/lib/supabase/server';
  import { getCurrentUser } from '@/lib/auth';
  import { validateOnboarding } from '@/lib/onboarding-validate';

  export type OnboardingState = { error: string | null };

  export async function completeOnboarding(
    _prev: OnboardingState,
    formData: FormData,
  ): Promise<OnboardingState> {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    // §5.2 id 回填竞态：auth 在但 profile 还没建出 → 不放行，落开通拦截（shell 会显示文案）。
    if (!user.profile) redirect('/');

    const parsed = validateOnboarding({
      displayName: String(formData.get('displayName') ?? ''),
      bio: String(formData.get('bio') ?? ''),
    });
    if (!parsed.ok) return { error: parsed.error };

    const supabase = await createClient();
    // 只改本人可改字段（display_name/bio）；account_status 由 RLS 允许本人在 invited→active 间推进。
    // role/email/roster_ref 不在此更新（受触发器锁死，§3.1）。
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: parsed.value.display_name,
        bio: parsed.value.bio,
        account_status: 'active',
      })
      .eq('id', user.authId);

    if (error) {
      return { error: '保存失败，请重试。若反复失败请联系管理员。' };
    }
    redirect('/');
  }
  ```

  > **依赖说明（给执行子智能体）：** 上面把 `account_status` 从 `invited`→`active` 的写入需要 RLS 允许「本人在 invited 态下置 active」。若阶段 2 的 §3.1 实现是「`account_status` 完全由触发器/admin 锁死、本人不可改」，则改为调用阶段 2 提供的受限 RPC（如 `activate_self()`，`SECURITY DEFINER`，仅把当前用户从 `invited` 推进到 `active`）。本 Task 假设二者之一存在；执行时先 `grep -r "activate_self\|account_status" supabase/migrations/` 确认，按实际接口二选一，不要新建与阶段 2 冲突的策略。

- [ ] 写 `app/onboarding/OnboardingForm.module.css`：
  ```css
  /* app/onboarding/OnboardingForm.module.css */
  .wrap {
    max-width: 460px;
    margin: 8vh auto;
    padding: 32px 28px;
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .title {
    font-size: 22px;
    color: var(--ink);
    margin: 0 0 6px;
  }
  .sub {
    color: var(--ink);
    opacity: 0.7;
    font-size: 14px;
    margin: 0 0 20px;
  }
  .roleChip {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--lemon);
    color: var(--ink);
    font-size: 13px;
    margin-bottom: 18px;
  }
  .label {
    display: block;
    font-size: 13px;
    margin: 14px 0 6px;
    color: var(--ink);
  }
  .input,
  .textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--paper);
    font-size: 15px;
    color: var(--ink);
  }
  .textarea {
    min-height: 72px;
    resize: vertical;
  }
  .btn {
    width: 100%;
    margin-top: 20px;
    padding: 11px;
    border: none;
    border-radius: 10px;
    background: var(--yellow);
    color: var(--ink);
    font-weight: 600;
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .err {
    margin-top: 10px;
    color: var(--coral);
    font-size: 13px;
  }
  ```
- [ ] 写 `app/onboarding/OnboardingForm.tsx`（CC，含三态；角色只读展示）：
  ```tsx
  // app/onboarding/OnboardingForm.tsx
  'use client';

  import { useActionState } from 'react';
  import { useFormStatus } from 'react-dom';
  import { completeOnboarding, type OnboardingState } from './actions';
  import styles from './OnboardingForm.module.css';

  function SubmitButton() {
    const { pending } = useFormStatus();
    return (
      <button className={styles.btn} type="submit" disabled={pending}>
        {pending ? '保存中…' : '确认，进入好奇'}
      </button>
    );
  }

  export default function OnboardingForm({
    displayName,
    bio,
    roleLabel,
  }: {
    displayName: string;
    bio: string | null;
    roleLabel: string;
  }) {
    const [state, formAction] = useActionState<OnboardingState, FormData>(
      completeOnboarding,
      { error: null },
    );

    return (
      <main className={styles.wrap}>
        <h1 className={styles.title}>确认你的资料</h1>
        <p className={styles.sub}>第一次进来，确认下昵称就可以开始。</p>
        <div className={styles.roleChip} aria-label={`你的角色是${roleLabel}（不可自行修改）`}>
          角色：{roleLabel}（管理员设定）
        </div>

        <form action={formAction}>
          <label className={styles.label} htmlFor="displayName">
            昵称
          </label>
          <input
            id="displayName"
            name="displayName"
            className={styles.input}
            defaultValue={displayName}
            maxLength={40}
            aria-label="昵称"
            required
          />

          <label className={styles.label} htmlFor="bio">
            一句话签名（可空）
          </label>
          <textarea
            id="bio"
            name="bio"
            className={styles.textarea}
            defaultValue={bio ?? ''}
            maxLength={200}
            aria-label="个性签名"
          />

          {state.error ? <p className={styles.err} role="alert">{state.error}</p> : null}

          <SubmitButton />
        </form>
      </main>
    );
  }
  ```
- [ ] 写 `app/onboarding/page.tsx`（SC：取当前 profile；非 invited 直接回首页/拦截，角色映射只读标签）：
  ```tsx
  // app/onboarding/page.tsx
  import { redirect } from 'next/navigation';
  import { getCurrentUser } from '@/lib/auth';
  import OnboardingForm from './OnboardingForm';

  export const dynamic = 'force-dynamic';

  const ROLE_LABEL: Record<string, string> = {
    student: '学生',
    teacher: '老师',
    admin: '管理员',
  };

  export default async function OnboardingPage() {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    if (!user.profile) redirect('/'); // 无 profile → shell 开通拦截
    if (user.profile.account_status === 'suspended') redirect('/'); // shell 停用拦截
    if (user.profile.account_status === 'active') redirect('/'); // 已确认过，别再确认

    return (
      <OnboardingForm
        displayName={user.profile.display_name}
        bio={user.profile.bio}
        roleLabel={ROLE_LABEL[user.profile.role] ?? user.profile.role}
      />
    );
  }
  ```
- [ ] 构建核对：
  ```bash
  cd /c/Users/david/haoqi-online && npm run build
  ```
- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add app/onboarding lib/onboarding-validate.ts lib/__tests__/onboarding-validate.test.ts
  git commit -m "feat(auth): 首次登录确认资料页 + 置 active（§5.3 第5步）

invited 用户确认昵称/签名(角色只读)→ Server Action 校验三态 → 写 profiles + account_status=active；profile 缺失走开通拦截(§5.2 id回填竞态保护)。"
  ```

**满足 spec：** §5.3 第 5 步（invited→确认资料→active，角色只读）、§5.2 id 回填竞态保护、§4.2 写操作走 Server Action 三态。

---

### Task 13：登录流程 Playwright e2e（本地 Supabase 注入 magic link token）

端到端验证 §6.6 A：未登录访问 `/courses` 被挡到 `/login?redirect=`；用本地 Supabase Admin API 生成 magic link，提取 token 走 `/auth/callback` 完成登录并落回原意图页；陌生邮箱不被创建；登录后访问 `/login` 跳走。e2e 性质（验收），用本地 Supabase 注入 token，不依赖真实邮件。

**Files:**
- Create: `e2e/auth.spec.ts`
- Create: `e2e/helpers/supabase-admin.ts`
- Create: `e2e/helpers/seed-auth-users.ts`

- [ ] 写 `e2e/helpers/supabase-admin.ts`（e2e 专用 admin 客户端 + 生成 magic link 的封装）：
  ```ts
  // e2e/helpers/supabase-admin.ts
  // 仅 e2e 用：本地 Supabase service-role 客户端，生成 magic link token 注入回调。
  // 读 .env.local / .env.test 里的本地 Supabase URL + service_role key。绝不进应用 bundle。
  import { createClient, type SupabaseClient } from '@supabase/supabase-js';

  export function adminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /**
   * 用 Admin API 生成 magic link，返回可直接 GET 的完整回调 URL。
   * generateLink 返回 action_link（含 token_hash + type），本地不发信，直接拿来打回调。
   */
  export async function generateMagicCallbackUrl(
    email: string,
    appOrigin: string,
    redirectTo: string,
  ): Promise<string> {
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${appOrigin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error || !data) throw new Error(`generateLink 失败: ${error?.message}`);
    // data.properties.action_link 指向 Supabase 的 /verify，会再 302 到我们的 /auth/callback。
    return data.properties.action_link;
  }
  ```
- [ ] 写 `e2e/helpers/seed-auth-users.ts`（在测试前用 Admin API 建 roster + 邀请用户，确保触发器建出 profile）：
  ```ts
  // e2e/helpers/seed-auth-users.ts
  // e2e 前置：upsert roster 行 + inviteUserByEmail，让触发器建出 profile。幂等。
  import { adminClient } from './supabase-admin';

  export interface SeedUser {
    email: string;
    display_name: string;
    role: 'student' | 'teacher' | 'admin';
    account_status?: 'invited' | 'active' | 'suspended';
  }

  export async function seedAuthUser(u: SeedUser): Promise<void> {
    const admin = adminClient();
    const email = u.email.trim().toLowerCase();

    // 1) upsert roster（触发器据此建 profile）
    const { error: rosterErr } = await admin
      .from('roster')
      .upsert(
        {
          email,
          display_name: u.display_name,
          role: u.role,
          roster_ref: `E2E-${u.role}`,
        },
        { onConflict: 'email' },
      );
    if (rosterErr) throw new Error(`seed roster 失败: ${rosterErr.message}`);

    // 2) 建 auth 用户（已存在则忽略错误）。本地直接 createUser 省去发信。
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr && !/registered|exists/i.test(createErr.message)) {
      throw new Error(`seed auth user 失败: ${createErr.message}`);
    }

    // 3) 若指定 account_status（如 suspended / active），直接用 admin 改 profile。
    if (u.account_status) {
      const { error: upErr } = await admin
        .from('profiles')
        .update({ account_status: u.account_status })
        .eq('email', email);
      if (upErr) throw new Error(`set account_status 失败: ${upErr.message}`);
    }
  }
  ```
- [ ] 写 `e2e/auth.spec.ts`（覆盖 §6.6 A 四条 + 陌生邮箱负样本）：
  ```ts
  // e2e/auth.spec.ts
  import { test, expect } from '@playwright/test';
  import { generateMagicCallbackUrl } from './helpers/supabase-admin';
  import { seedAuthUser } from './helpers/seed-auth-users';

  const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

  const STUDENT = 'e2e-student@example.com';
  const TEACHER = 'e2e-teacher@example.com';
  const SUSPENDED = 'e2e-suspended@example.com';
  const STRANGER = 'e2e-stranger-not-in-roster@example.com';

  test.beforeAll(async () => {
    await seedAuthUser({ email: STUDENT, display_name: '学生甲', role: 'student' });
    await seedAuthUser({ email: TEACHER, display_name: '老师乙', role: 'teacher' });
    await seedAuthUser({
      email: SUSPENDED,
      display_name: '停用丙',
      role: 'student',
      account_status: 'suspended',
    });
    // STRANGER 不 seed：模拟陌生邮箱。
  });

  test('未登录访问受保护页被挡回登录，带 redirect', async ({ page }) => {
    await page.goto(`${ORIGIN}/courses`);
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcourses/);
    await expect(page.getByText('登录')).toBeVisible();
  });

  test('魔法链接登录成功并落回原意图页 /courses', async ({ page, context }) => {
    const callbackUrl = await generateMagicCallbackUrl(STUDENT, ORIGIN, '/courses');
    // 直接走 magic link（Supabase verify → 302 我们的 /auth/callback → 落 /courses 或 /onboarding）
    await page.goto(callbackUrl);
    // 首登是 invited → 被引到 /onboarding，确认资料后才落业务页
    await expect(page).toHaveURL(/\/onboarding|\/courses/);
    if (page.url().includes('/onboarding')) {
      await page.getByLabel('昵称').fill('学生甲');
      await page.getByRole('button', { name: '确认，进入好奇' }).click();
    }
    // 确认后回首页；再访问 /courses 应放行（已登录）
    await page.goto(`${ORIGIN}/courses`);
    await expect(page).not.toHaveURL(/\/login/);
    // 已登录访问 /login 跳走
    await page.goto(`${ORIGIN}/login`);
    await expect(page).not.toHaveURL(/\/login$/);
    // cookie 应有 supabase auth token
    const cookies = await context.cookies();
    expect(cookies.some((c) => /sb-.*-auth-token/.test(c.name))).toBe(true);
  });

  test('陌生邮箱发链接不创建账号（shouldCreateUser:false）', async ({ page }) => {
    await page.goto(`${ORIGIN}/login`);
    await page.getByLabel('登录邮箱').fill(STRANGER);
    await page.getByRole('button', { name: /发送登录链接/ }).click();
    // 邀请制：陌生邮箱发送应失败/给提示，不应显示「链接已发到」成功态
    await expect(page.getByText(/不在名单|发送失败/)).toBeVisible();
  });

  test('suspended 账号登录后被拦在停用页', async ({ page }) => {
    const callbackUrl = await generateMagicCallbackUrl(SUSPENDED, ORIGIN, '/');
    await page.goto(callbackUrl);
    await expect(page.getByText('账号已被停用')).toBeVisible();
  });

  test('链接里带过期 error 落 link-expired 文案，不白屏不500', async ({ page }) => {
    await page.goto(
      `${ORIGIN}/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`,
    );
    await expect(page).toHaveURL(/\/login\?error=link-expired/);
    await expect(page.getByText('链接失效了')).toBeVisible();
  });
  ```
- [ ] 确保本地 Supabase 在跑、应用在跑，再执行 e2e：
  ```bash
  cd /c/Users/david/haoqi-online
  npx supabase status >/dev/null 2>&1 || npx supabase start
  npx supabase db reset --local   # 应用 migrations + seed（含 roster），保证触发器/RLS 就位
  npm run test:e2e -- e2e/auth.spec.ts
  ```
- [ ] commit：
  ```bash
  cd /c/Users/david/haoqi-online
  git add e2e/auth.spec.ts e2e/helpers
  git commit -m "test(e2e): 登录流程 Playwright（本地 Supabase 注入 magic link）

覆盖 §6.6 A：未登录挡回登录带redirect、魔法链接登录落原意图页、陌生邮箱不建号、suspended拦停用页、过期链接落link-expired文案不白屏。"
  ```

**满足 spec：** §6.6 A 全 4 条 + §5.8 验收 1/2/6 的登录侧负样本（陌生邮箱拒绝、suspended 拦截、大小写匹配由触发器保证）。

---

### Task 14：全量校验 + PR

收口跑全部单测、lint、build、auth e2e，确认绿，提 PR（带 `Closes #编号`）。

**Files:**
- Modify: 无（仅校验 + PR）

- [ ] 全量单测 + lint + build：
  ```bash
  cd /c/Users/david/haoqi-online
  npm run test && npm run lint && npm run build
  ```
- [ ] auth e2e 复跑确认绿：
  ```bash
  cd /c/Users/david/haoqi-online && npm run test:e2e -- e2e/auth.spec.ts
  ```
- [ ] 安全核对：service_role 不入客户端、login 页与 form 不 import admin：
  ```bash
  cd /c/Users/david/haoqi-online
  grep -rn "supabase/admin\|SERVICE_ROLE" "app/(auth)" "app/(shell)" app/onboarding lib/auth.ts lib/login-copy.ts && echo "LEAK_FOUND" || echo "no service-role in client paths: OK"
  ```
  期望输出 `no service-role in client paths: OK`（e2e/helpers 用 service-role 是允许的，因为不进应用 bundle）。
- [ ] 推分支 + 开 PR：
  ```bash
  cd /c/Users/david/haoqi-online
  git push -u origin feat/auth-magic-link
  gh pr create --base main --title "feat(auth): 登录(魔法链接邀请制)+角色+花名册据roster就位" --body "$(cat <<'EOF'
Closes #<阶段3-issue编号>

## 做了什么
- lib/auth.ts：getCurrentUser() 读 profiles 取角色；isAdmin/isTeacher；resolveAccessBoundary 入口裁决（§5.3/§5.4）
- middleware.ts + lib/middleware-logic.ts：刷新 session、未登录挡回 /login?redirect=、登录后回原意图、防 open redirect（§6.6 A-2）
- app/(auth)/login：魔法链接页 + §5.7 全状态（loading/empty/error/sent/重发冷却 + link-expired/consumed/cross-device/not-in-roster/callback-error 文案）
- app/(auth)/auth/callback：换 session、失败 redirect 带 error 不抛 500（§5.3）
- app/(shell)/layout + AccessGate：suspended→停用页、有auth无profile→开通页、invited→/onboarding（§5.3 异常分支全有界面）
- app/onboarding：首次登录确认资料→置 active，角色只读（§5.3 第5步），处理 §5.2 id 回填竞态
- 单测：getCurrentUser/守卫/middleware判定/login文案/callback归类/access文案/onboarding校验
- e2e：本地 Supabase 注入 magic link，覆盖 §6.6 A 四条 + 陌生邮箱/suspended/过期负样本

## 没做什么（诚实标注）
- roster/profiles 建表 + RLS + on auth.users 触发器在阶段2 PR（本阶段依赖、不重复建）
- 头像上传 OUT（§4.4 首切片只读图）；onboarding 只确认昵称/签名
- 花名册批量预置 CSV 脚本不在本阶段（§5.6 单列阶段）
- account_status invited→active 写入依赖阶段2 的 RLS/RPC，已在 actions.ts 注释标明二选一接法
- (shell) 的 Sidebar/Topbar 外壳由外壳阶段补，本阶段 layout 只放鉴权

## 怎么验证
- npm run test / npm run lint / npm run build 全过
- npm run test:e2e -- e2e/auth.spec.ts 全过（本地 supabase db reset 后）
- 安全 grep：service_role 不在任何客户端路径

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
  ```

**满足 spec：** §6.6 A 全部；§6.5 质量门槛（build/lint 过、密钥不入客户端）、§6.2 PR 带 Closes。

---

> **执行子智能体须知（跨 Task 依赖）：**
> 1. `app/(shell)/layout.tsx`（Task 11）是公共外壳文件——按 §4.6 改它前应与「外壳阶段」对齐；本阶段只放 `AccessGate`，外壳阶段往里加 Sidebar/Topbar 时应保留 `AccessGate` 包裹。
> 2. Task 12 的 `completeOnboarding` 对 `account_status invited→active` 的写入，与阶段 2 的 §3.1 实现绑定：若阶段 2 锁死本人不可改 `account_status`，改调阶段 2 的 `activate_self()` RPC（执行前 `grep -r "activate_self\|account_status" supabase/migrations/` 确认接口）。
> 3. e2e（Task 13）依赖阶段 2 的 `roster`/`profiles`/触发器/RLS 已 migrate；跑前必须 `supabase db reset --local`。
> 4. 路径口径以 §4.1 为准（`app/`、`lib/`、`middleware.ts` 在仓库根，无 `src/`）；若阶段 1 实际用了 `src/`，全阶段统一加 `src/` 前缀并同步 `@/` alias 指向。

**相关文件路径（绝对）：**
- spec：`C:/Users/david/haoqi-online/docs/specs/2026-06-21-haoqi-online-first-slice-design.md`（§5.1–§5.8、§4.3、§2.0、§4.1、§3.0/§3.1）
- 本阶段产物根：`C:/Users/david/haoqi-online/`（`lib/auth.ts`、`lib/auth-types.ts`、`middleware.ts`、`app/(auth)/login/*`、`app/(auth)/auth/callback/route.ts`、`app/(shell)/layout.tsx` + `_auth/*`、`app/onboarding/*`、`e2e/auth.spec.ts` + `e2e/helpers/*`）

---

## 阶段 4：首页（此刻）真数据

> **本阶段范围**：把首页（`src/app/(shell)/page.tsx`）从外壳/静态接到真数据。覆盖三组数据层函数（今天课表+调课、跨课程综合动态流、最近社区动态派生）的 TDD 单测；首页 Server Component 组装；今天的课卡 + 调课横幅（按 `ScheduleChange.id` 记本地已读）+ 课表卡标红（不替换实体）；综合动态流 + 横滑课程头像筛选（Client Component）；积分/阅读诚实占位；最近社区动态只读；各屏 loading/empty/error 状态；e2e 覆盖 §6.6 **D（调课）** 与 **B 的首页部分**。
>
> **对应 spec 小节**：§2.1（首页构成与六态）、§2.3（调课统一呈现）、§3.5/§3.6（ScheduleSlot/ScheduleChange）、§3.7（Post）、§4.2（SC 取数 vs CC 交互）、§4.4（读图 signed URL）。
>
> **前置假设（由前面阶段交付，本阶段直接复用，不重复定义）**：
> - `src/lib/supabase/server.ts` 导出 `createClient()`（基于 cookies 的服务端客户端，受 RLS）。
> - `src/lib/auth.ts` 导出 `getCurrentUser()`（返回 `{ id, role, display_name, avatar_url } | null`）。
> - `src/lib/types.ts` 导出 Supabase 生成的 `Database` 类型及表别名 `Course / ScheduleSlot / ScheduleChange / Post / Comment / Profile`（行类型）。
> - `src/components/ui/StateBlock.tsx` 导出 `<StateBlock variant="loading|empty|error" title message onRetry? />`（统一六态块，前面阶段已建）。
> - `src/components/ui/Avatar.tsx` 导出 `<Avatar name avatarUrl? size? />`（无图用名字首字色块）。
> - 外壳 `src/app/(shell)/layout.tsx`、`globals.css` token、active Term 周次计算 `src/lib/term.ts` 的 `getActiveTermWeek()` 已就位。
> - 测试基建：`vitest.config.ts`、`playwright.config.ts`、`npm run test` / `npm run test:e2e` 可跑；本地 Supabase（`supabase start`）+ `supabase/seed.sql` 已含 Term/Course/ScheduleSlot/roster/Post(含草稿)/PostAsset/ScheduleChange(含 cancelled)。
>
> 若某前置不存在，执行子智能体应先在对应阶段补齐再做本阶段，不在本阶段临时自创。
>
> **时区铁律（§2.1.2）**：所有「今天/当天」一律按 `Asia/Shanghai` 解释。本阶段引入纯函数 `nowInShanghai()` / `shanghaiToday()` / `shanghaiWeekday()` 统一口径，避免 UTC 误差。

---

### Task 1：Shanghai 时区工具（纯函数，TDD）

**满足**：§2.1.2 时区基准（Asia/Shanghai）；为后续「今天的课」「当天调课」提供统一日期口径。这是不变量「今天的课不错一天」的基础。

**Files:**
- Test: `src/lib/time/shanghai.test.ts`
- Create: `src/lib/time/shanghai.ts`

**Steps:**

- [ ] 写失败测试 `src/lib/time/shanghai.ts` 的契约。创建 `src/lib/time/shanghai.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { shanghaiToday, shanghaiWeekday, shanghaiClockMinutes } from "./shanghai";

describe("shanghai time helpers", () => {
  it("shanghaiToday: UTC 2026-03-01T20:00Z 在上海是 2026-03-02", () => {
    // 北京时间 = UTC+8，20:00Z + 8h = 次日 04:00
    expect(shanghaiToday(new Date("2026-03-01T20:00:00Z"))).toBe("2026-03-02");
  });

  it("shanghaiToday: UTC 2026-03-01T10:00Z 在上海仍是 2026-03-01", () => {
    expect(shanghaiToday(new Date("2026-03-01T10:00:00Z"))).toBe("2026-03-01");
  });

  it("shanghaiWeekday: 2026-03-02 是周一 → 1", () => {
    // 2026-03-02 是星期一
    expect(shanghaiWeekday(new Date("2026-03-01T20:00:00Z"))).toBe(1);
  });

  it("shanghaiWeekday: 周日返回 7（不是 0）", () => {
    // 2026-03-01 是星期日
    expect(shanghaiWeekday(new Date("2026-03-01T10:00:00Z"))).toBe(7);
  });

  it("shanghaiClockMinutes: UTC 2026-03-01T01:30Z → 上海 09:30 → 570 分钟", () => {
    expect(shanghaiClockMinutes(new Date("2026-03-01T01:30:00Z"))).toBe(570);
  });
});
```

- [ ] 跑测试看它失败（模块不存在）：`npm run test -- src/lib/time/shanghai.test.ts`

- [ ] 写最小实现 `src/lib/time/shanghai.ts`：

```ts
// 统一以 Asia/Shanghai 解释"今天/当天/当前时刻"，避免 UTC 误差（spec §2.1.2）。
// 用 Intl.DateTimeFormat 取上海本地的年月日与时分，不引第三方时区库。

const TZ = "Asia/Shanghai";

function shanghaiParts(d: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const hour = get("hour") === "24" ? 0 : Number(get("hour")); // hour12:false 在午夜可能给 24
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
  };
}

/** 返回上海本地日期，格式 YYYY-MM-DD（用于匹配 ScheduleChange.occurs_on / date 列）。 */
export function shanghaiToday(now: Date = new Date()): string {
  const { year, month, day } = shanghaiParts(now);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** 返回上海本地星期几，1=周一 … 7=周日（对齐 ScheduleSlot.weekday check 1..7）。 */
export function shanghaiWeekday(now: Date = new Date()): number {
  const { year, month, day } = shanghaiParts(now);
  // 用 UTC 构造同一日历日，getUTCDay 不受运行环境时区影响
  const utc = new Date(Date.UTC(year, month - 1, day));
  const dow = utc.getUTCDay(); // 0=周日 … 6=周六
  return dow === 0 ? 7 : dow;
}

/** 返回上海本地"当天已过的分钟数"（用于和 slot 的 HH:MM 比较，判断 now / 还有 N 分钟）。 */
export function shanghaiClockMinutes(now: Date = new Date()): number {
  const { hour, minute } = shanghaiParts(now);
  return hour * 60 + minute;
}

/** 把 "HH:MM[:SS]" 的 time 字符串转成当天分钟数（与 shanghaiClockMinutes 同口径比较）。 */
export function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
}
```

- [ ] 跑测试看通过：`npm run test -- src/lib/time/shanghai.test.ts`

- [ ] commit：

```bash
git add src/lib/time/shanghai.ts src/lib/time/shanghai.test.ts
git commit -m "feat(home): add Asia/Shanghai time helpers for today's schedule

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2：调课叠加纯逻辑（取最新未软删 ScheduleChange，TDD）

**满足**：§2.3 调课统一呈现、§3.6 派生渲染规则（`(slot_id, occurs_on)` 取最新未软删；软删恢复原状；绝不替换实体）。对应 §6.6 **D** 的「标红/横幅来源」「撤回后恢复」。

**Files:**
- Test: `src/lib/queries/schedule.logic.test.ts`
- Create: `src/lib/queries/schedule.logic.ts`

**Steps:**

- [ ] 写失败测试。创建 `src/lib/queries/schedule.logic.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { pickEffectiveChange, applyChangeToRow, type RawChange } from "./schedule.logic";

const base = {
  slot_id: "slot-1",
  occurs_on: "2026-03-02",
  change_type: "location" as const,
  message: "改到 创客空间",
  new_location: "创客空间",
  new_starts_at: null,
  new_ends_at: null,
  published_at: "2026-03-01T02:00:00Z",
  deleted_at: null as string | null,
};

describe("pickEffectiveChange", () => {
  it("同 slot+occurs_on 取 published_at 最新的未软删行", () => {
    const changes: RawChange[] = [
      { ...base, id: "c1", published_at: "2026-03-01T01:00:00Z", new_location: "A 室", message: "改到 A 室" },
      { ...base, id: "c2", published_at: "2026-03-01T03:00:00Z", new_location: "B 室", message: "改到 B 室" },
    ];
    expect(pickEffectiveChange(changes)?.id).toBe("c2");
  });

  it("最新行被软删 → 回落到次新未软删行", () => {
    const changes: RawChange[] = [
      { ...base, id: "c1", published_at: "2026-03-01T01:00:00Z" },
      { ...base, id: "c2", published_at: "2026-03-01T03:00:00Z", deleted_at: "2026-03-01T04:00:00Z" },
    ];
    expect(pickEffectiveChange(changes)?.id).toBe("c1");
  });

  it("全部软删 → 返回 null（卡片恢复原状）", () => {
    const changes: RawChange[] = [
      { ...base, id: "c1", deleted_at: "2026-03-01T05:00:00Z" },
    ];
    expect(pickEffectiveChange(changes)).toBeNull();
  });

  it("空数组返回 null", () => {
    expect(pickEffectiveChange([])).toBeNull();
  });
});

describe("applyChangeToRow", () => {
  const row = {
    slotId: "slot-1",
    courseId: "course-1",
    courseName: "城市漫游",
    startsAt: "09:00",
    endsAt: "10:30",
    location: "原 教室一",
    note: null as string | null,
    semanticColor: "blue",
  };

  it("无 change → 原行不变、changed=false", () => {
    const out = applyChangeToRow(row, null);
    expect(out.changed).toBe(false);
    expect(out.cancelled).toBe(false);
    expect(out.location).toBe("原 教室一");
  });

  it("location 变更 → 覆盖展示地点、changed=true、保留 courseId 入口", () => {
    const out = applyChangeToRow(row, { ...base, id: "c1" });
    expect(out.changed).toBe(true);
    expect(out.location).toBe("创客空间");
    expect(out.courseId).toBe("course-1"); // 入口绝不丢
  });

  it("time 变更 → 覆盖 startsAt/endsAt", () => {
    const out = applyChangeToRow(row, {
      ...base,
      id: "c2",
      change_type: "time",
      new_location: null,
      new_starts_at: "13:00",
      new_ends_at: "14:30",
      message: "改到 13:00",
    });
    expect(out.startsAt).toBe("13:00");
    expect(out.endsAt).toBe("14:30");
    expect(out.changed).toBe(true);
  });

  it("cancelled 变更 → cancelled=true 但 courseId 入口仍在", () => {
    const out = applyChangeToRow(row, {
      ...base,
      id: "c3",
      change_type: "cancelled",
      new_location: null,
      message: "今天停课",
    });
    expect(out.cancelled).toBe(true);
    expect(out.courseId).toBe("course-1");
  });

  it("note 变更 → note 填 message、changed=true", () => {
    const out = applyChangeToRow(row, {
      ...base,
      id: "c4",
      change_type: "note",
      new_location: null,
      message: "记得带速写本",
    });
    expect(out.note).toBe("记得带速写本");
    expect(out.changed).toBe(true);
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/lib/queries/schedule.logic.test.ts`

- [ ] 写最小实现 `src/lib/queries/schedule.logic.ts`：

```ts
// 纯逻辑：把同 (slot_id, occurs_on) 的多条 ScheduleChange 收敛为"生效变更"，
// 并把生效变更叠加到课表行上。绝不修改原 ScheduleSlot 实体（§2.3 / §3.6 铁律）。

export type ChangeType = "location" | "time" | "cancelled" | "note";

export interface RawChange {
  id: string;
  slot_id: string;
  occurs_on: string;
  change_type: ChangeType;
  message: string;
  new_location: string | null;
  new_starts_at: string | null;
  new_ends_at: string | null;
  published_at: string;
  deleted_at: string | null;
}

export interface ScheduleRow {
  slotId: string;
  courseId: string | null;
  courseName: string | null;
  startsAt: string; // HH:MM
  endsAt: string; // HH:MM
  location: string | null;
  note: string | null;
  semanticColor: string;
}

export interface EffectiveRow extends ScheduleRow {
  changed: boolean;
  cancelled: boolean;
  changeId: string | null;
  changeType: ChangeType | null;
  changeMessage: string | null;
}

/** 同一 (slot,occurs_on) 取 published_at 最新的未软删变更；全软删/空 → null（回落原状）。 */
export function pickEffectiveChange(changes: RawChange[]): RawChange | null {
  const live = changes.filter((c) => c.deleted_at === null);
  if (live.length === 0) return null;
  return live.reduce((latest, c) =>
    new Date(c.published_at).getTime() > new Date(latest.published_at).getTime() ? c : latest,
  );
}

/** 把生效变更叠加到课表行；不改课程实体，courseId 入口在任何分支都保留。 */
export function applyChangeToRow(row: ScheduleRow, change: RawChange | null): EffectiveRow {
  if (change === null) {
    return {
      ...row,
      changed: false,
      cancelled: false,
      changeId: null,
      changeType: null,
      changeMessage: null,
    };
  }

  const next: EffectiveRow = {
    ...row,
    changed: true,
    cancelled: change.change_type === "cancelled",
    changeId: change.id,
    changeType: change.change_type,
    changeMessage: change.message,
  };

  if (change.change_type === "location" && change.new_location !== null) {
    next.location = change.new_location;
  }
  if (change.change_type === "time") {
    if (change.new_starts_at !== null) next.startsAt = change.new_starts_at.slice(0, 5);
    if (change.new_ends_at !== null) next.endsAt = change.new_ends_at.slice(0, 5);
  }
  if (change.change_type === "note") {
    next.note = change.message;
  }
  return next;
}
```

- [ ] 跑测试看通过：`npm run test -- src/lib/queries/schedule.logic.test.ts`

- [ ] commit：

```bash
git add src/lib/queries/schedule.logic.ts src/lib/queries/schedule.logic.test.ts
git commit -m "feat(home): pure logic to overlay latest ScheduleChange without mutating slot

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3：摘要安全截断 + 行状态纯逻辑（TDD）

**满足**：§2.1.3 摘要按字素簇安全截断（`Intl.Segmenter`，约 80 字）；§2.1.2 行状态 `.now`/`还有 N 分钟`（按加载时刻快照计算）。

**Files:**
- Test: `src/lib/queries/feed.logic.test.ts`
- Create: `src/lib/queries/feed.logic.ts`

**Steps:**

- [ ] 写失败测试。创建 `src/lib/queries/feed.logic.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { excerptFromMarkdown, rowTiming } from "./feed.logic";

describe("excerptFromMarkdown", () => {
  it("短文本原样返回、不加省略号", () => {
    expect(excerptFromMarkdown("今天去了城市的边角", 80)).toBe("今天去了城市的边角");
  });

  it("超长按字素簇截断并加省略号", () => {
    const long = "城".repeat(200);
    const out = excerptFromMarkdown(long, 80);
    expect(out.endsWith("…")).toBe(true);
    expect([...new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(out.slice(0, -1))].length).toBe(80);
  });

  it("不截断半个 emoji（字素簇安全）", () => {
    const text = "🎨".repeat(100);
    const out = excerptFromMarkdown(text, 3);
    // 截断后去掉省略号应是 3 个完整 emoji，不出现替换符
    expect(out).toBe("🎨🎨🎨…");
  });

  it("null/空 body 返回空串", () => {
    expect(excerptFromMarkdown(null, 80)).toBe("");
    expect(excerptFromMarkdown("", 80)).toBe("");
  });
});

describe("rowTiming", () => {
  it("now 落在 [start,end] → status=now", () => {
    expect(rowTiming(540, 600, 570).status).toBe("now"); // 09:00-10:00, now 09:30
  });

  it("now 在开始前 → status=upcoming，带 minutesUntil", () => {
    const t = rowTiming(600, 660, 570); // 10:00 课，now 09:30
    expect(t.status).toBe("upcoming");
    expect(t.minutesUntil).toBe(30);
  });

  it("now 在结束后 → status=past", () => {
    expect(rowTiming(540, 600, 700).status).toBe("past");
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/lib/queries/feed.logic.test.ts`

- [ ] 写最小实现 `src/lib/queries/feed.logic.ts`：

```ts
// 动态摘要的字素簇安全截断 + 课表行时序判定（按页面加载时刻的快照计算，§2.1.2 / §2.1.3）。

/** 取 markdown 纯文本的前 maxGraphemes 个字素簇，超出加省略号；不截半个 emoji。 */
export function excerptFromMarkdown(body: string | null, maxGraphemes: number): string {
  if (!body) return "";
  // 极轻量去 markdown 记号：仅去掉标题井号/列表符/强调符，不做完整解析（首页摘要够用）
  const plain = body
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const seg = new Intl.Segmenter("zh", { granularity: "grapheme" });
  const graphemes = [...seg.segment(plain)].map((s) => s.segment);
  if (graphemes.length <= maxGraphemes) return graphemes.join("");
  return graphemes.slice(0, maxGraphemes).join("") + "…";
}

export type RowStatus = "now" | "upcoming" | "past";

export interface RowTiming {
  status: RowStatus;
  minutesUntil: number | null; // upcoming 时为距开始分钟数，否则 null
}

/** 用"当天分钟数"快照判定行状态；不随时间走动，页面标注"刷新更新"（§2.1.2）。 */
export function rowTiming(startMin: number, endMin: number, nowMin: number): RowTiming {
  if (nowMin >= startMin && nowMin <= endMin) return { status: "now", minutesUntil: null };
  if (nowMin < startMin) return { status: "upcoming", minutesUntil: startMin - nowMin };
  return { status: "past", minutesUntil: null };
}
```

- [ ] 跑测试看通过：`npm run test -- src/lib/queries/feed.logic.test.ts`

- [ ] commit：

```bash
git add src/lib/queries/feed.logic.ts src/lib/queries/feed.logic.test.ts
git commit -m "feat(home): grapheme-safe excerpt + row timing pure logic

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4：`getTodaySchedule()` 数据层（对本地 seed 集成测试，TDD）

**满足**：§2.1.2 今天的课数据源（active Term + `weekday=今天` 的 ScheduleSlot + 当天可见 ScheduleChange）、§3.5/§3.6、§4.2（SC 取数走 server.ts、RLS 兜底）。对应 §6.6 **D**「今天课表卡片来源」。

> 集成测试用真实本地 Supabase（`supabase start`）+ seed 数据，以 anon 客户端模拟登录学生断言。测试前置：seed 须含一门课在「某固定 weekday」有 slot，且该 (slot, 某日期) 有一条 location 变更 + 一条 cancelled 变更。测试通过注入固定 `now` 规避「跑测试当天恰好无课」的脆弱性。

**Files:**
- Create: `src/lib/queries/schedule.ts`
- Test: `src/lib/queries/schedule.integration.test.ts`
- Modify: `supabase/seed.sql`（追加可被测试稳定命中的固定 slot/change，见步骤）

**Steps:**

- [ ] 先在 `supabase/seed.sql` 末尾追加一段**测试锚点数据**（固定 id，便于断言），保证集成测试稳定。在文件末尾追加：

```sql
-- ===== 阶段4 首页测试锚点（固定 id，供 getTodaySchedule 集成测试断言）=====
-- 课程：城市漫游（已在上文 seed，引用其 id 假设为 '00000000-0000-0000-0000-0000000000c1'）
-- 固定一个周三(weekday=3) 09:00-10:30 的 slot
insert into public."ScheduleSlot" (id, term_id, course_id, weekday, starts_at, ends_at, slot_kind)
values ('00000000-0000-0000-0000-00000000s001',
        (select id from public."Term" where is_active limit 1),
        '00000000-0000-0000-0000-0000000000c1',
        3, '09:00', '10:30', 'required')
on conflict (id) do nothing;

-- 该 slot 在 2026-03-04（周三）有一条 location 变更
insert into public."ScheduleChange"
  (id, slot_id, occurs_on, change_type, message, new_location, published_by, published_at, deleted_at)
values ('00000000-0000-0000-0000-00000000h001',
        '00000000-0000-0000-0000-00000000s001', '2026-03-04', 'location',
        '改到 创客空间', '创客空间',
        (select id from public.profiles where role = 'teacher' limit 1),
        '2026-03-03T02:00:00Z', null)
on conflict (id) do nothing;

-- 同 slot 同天一条 cancelled 变更（published_at 更晚 → 应被 location 那条之后？不：测试只验单类型，此处放到不同日期避免互相覆盖）
insert into public."ScheduleChange"
  (id, slot_id, occurs_on, change_type, message, new_location, published_by, published_at, deleted_at)
values ('00000000-0000-0000-0000-00000000h002',
        '00000000-0000-0000-0000-00000000s001', '2026-03-11', 'cancelled',
        '今天停课', null,
        (select id from public.profiles where role = 'teacher' limit 1),
        '2026-03-10T02:00:00Z', null)
on conflict (id) do nothing;
```

> 注：`s001/h001/h002` 占位 id 仅示意；执行子智能体须用合法 uuid（如 `aaaaaaaa-...`）并在测试里引用同值。课程 id `...c1` 应替换为 seed 中「城市漫游」的真实 id。这些值**在本任务内定义一次**，测试与 seed 共享同一常量文件（见下一步）。

- [ ] 建共享常量 `src/lib/queries/_fixtures.ts`（测试与断言共用，避免魔法字符串散落）：

```ts
// 阶段4 集成测试锚点常量：必须与 supabase/seed.sql 末尾追加段一致。
export const FIXTURE = {
  courseCityWalkId: "00000000-0000-0000-0000-0000000000c1",
  slotWedId: "00000000-0000-0000-0000-00000000s001",
  changeLocationId: "00000000-0000-0000-0000-00000000h001",
  changeLocationOn: "2026-03-04", // 周三
  changeCancelledId: "00000000-0000-0000-0000-00000000h002",
  changeCancelledOn: "2026-03-11", // 周三
} as const;
```

- [ ] 写失败的集成测试 `src/lib/queries/schedule.integration.test.ts`：

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getTodaySchedule } from "./schedule";
import { FIXTURE } from "./_fixtures";

// 用本地 Supabase 的 anon 客户端 + 一个学生测试账号登录后查询，验证 RLS 下数据形状。
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL!;
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD!;

let studentClient: SupabaseClient;

beforeAll(async () => {
  studentClient = createClient(url, anon);
  const { error } = await studentClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });
  if (error) throw error;
});

describe("getTodaySchedule (integration, local seed)", () => {
  it("location 变更日：返回该周三 slot，叠加 location 变更后地点=创客空间，courseId 入口保留", async () => {
    const now = new Date("2026-03-04T01:00:00Z"); // 上海 09:00 周三
    const rows = await getTodaySchedule(studentClient, now);
    const target = rows.find((r) => r.slotId === FIXTURE.slotWedId);
    expect(target).toBeDefined();
    expect(target!.changed).toBe(true);
    expect(target!.location).toBe("创客空间");
    expect(target!.cancelled).toBe(false);
    expect(target!.courseId).toBe(FIXTURE.courseCityWalkId); // 入口绝不丢
  });

  it("cancelled 变更日：行 cancelled=true 但 courseId 入口仍在", async () => {
    const now = new Date("2026-03-11T01:00:00Z"); // 上海 周三
    const rows = await getTodaySchedule(studentClient, now);
    const target = rows.find((r) => r.slotId === FIXTURE.slotWedId);
    expect(target).toBeDefined();
    expect(target!.cancelled).toBe(true);
    expect(target!.courseId).toBe(FIXTURE.courseCityWalkId);
  });

  it("非该 weekday 的日子：不返回该周三 slot", async () => {
    const now = new Date("2026-03-05T01:00:00Z"); // 周四
    const rows = await getTodaySchedule(studentClient, now);
    expect(rows.find((r) => r.slotId === FIXTURE.slotWedId)).toBeUndefined();
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/lib/queries/schedule.integration.test.ts`（模块缺失）。需先 `supabase start` 且 `supabase db reset`（应用迁移 + seed），并在 `.env.local`/CI 注入 `TEST_STUDENT_EMAIL/PASSWORD`（前面登录阶段已为本地 seed 学生设密码登录通道）。

- [ ] 写实现 `src/lib/queries/schedule.ts`：

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { shanghaiToday, shanghaiWeekday, shanghaiClockMinutes, timeStringToMinutes } from "@/lib/time/shanghai";
import {
  pickEffectiveChange,
  applyChangeToRow,
  type RawChange,
  type EffectiveRow,
} from "./schedule.logic";
import { rowTiming, type RowStatus } from "./feed.logic";

export interface TodayScheduleRow extends EffectiveRow {
  status: RowStatus;
  minutesUntil: number | null;
  slotKind: string;
}

// 课程语义色映射（与原型 token 一致；无 short_name 时按创建序兜底）。
const SEMANTIC_COLORS = ["blue", "yellow", "coral", "mint", "pink"] as const;
function colorFor(idx: number): string {
  return SEMANTIC_COLORS[idx % SEMANTIC_COLORS.length];
}

/**
 * 取"今天的官方课表"：active Term + weekday=今天的 ScheduleSlot（按 starts_at 升序），
 * 叠加当天可见的最新未软删 ScheduleChange。只读官方课表，不混个人计划。RLS 在 client 层兜底。
 */
export async function getTodaySchedule(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<TodayScheduleRow[]> {
  const weekday = shanghaiWeekday(now);
  const today = shanghaiToday(now);
  const nowMin = shanghaiClockMinutes(now);

  // active term
  const { data: term, error: termErr } = await supabase
    .from("Term")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (termErr) throw termErr;
  if (!term) return [];

  // 今天 weekday 的 slot + 课程信息
  const { data: slots, error: slotErr } = await supabase
    .from("ScheduleSlot")
    .select(
      `id, course_id, weekday, starts_at, ends_at, slot_kind,
       Course:course_id ( id, name, short_name )`,
    )
    .eq("term_id", term.id)
    .eq("weekday", weekday)
    .order("starts_at", { ascending: true });
  if (slotErr) throw slotErr;
  if (!slots || slots.length === 0) return [];

  const slotIds = slots.map((s) => s.id as string);

  // 当天该批 slot 的全部变更（RLS 已过滤不可见课程；deleted_at 这里不过滤，交 pickEffectiveChange 处理软删回落）
  const { data: changes, error: changeErr } = await supabase
    .from("ScheduleChange")
    .select(
      `id, slot_id, occurs_on, change_type, message, new_location,
       new_starts_at, new_ends_at, published_at, deleted_at`,
    )
    .in("slot_id", slotIds)
    .eq("occurs_on", today);
  if (changeErr) throw changeErr;

  const changeBySlot = new Map<string, RawChange[]>();
  for (const c of (changes ?? []) as RawChange[]) {
    const arr = changeBySlot.get(c.slot_id) ?? [];
    arr.push(c);
    changeBySlot.set(c.slot_id, arr);
  }

  return slots.map((s, idx) => {
    const course = (s as { Course?: { id: string; name: string; short_name: string | null } }).Course;
    const baseRow = {
      slotId: s.id as string,
      courseId: (s.course_id as string | null) ?? null,
      courseName: course?.name ?? null,
      startsAt: (s.starts_at as string).slice(0, 5),
      endsAt: (s.ends_at as string).slice(0, 5),
      location: null as string | null,
      note: null as string | null,
      semanticColor: colorFor(idx),
    };
    const effective = applyChangeToRow(baseRow, pickEffectiveChange(changeBySlot.get(s.id as string) ?? []));
    const timing = rowTiming(
      timeStringToMinutes(effective.startsAt),
      timeStringToMinutes(effective.endsAt),
      nowMin,
    );
    return {
      ...effective,
      status: timing.status,
      minutesUntil: timing.minutesUntil,
      slotKind: s.slot_kind as string,
    };
  });
}
```

- [ ] 跑测试看通过：`npm run test -- src/lib/queries/schedule.integration.test.ts`

- [ ] commit：

```bash
git add src/lib/queries/schedule.ts src/lib/queries/schedule.integration.test.ts src/lib/queries/_fixtures.ts supabase/seed.sql
git commit -m "feat(home): getTodaySchedule reads slots + overlays today's ScheduleChange

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5：`getTodayBanner()` 调课横幅聚合数据层（集成测试，TDD）

**满足**：§2.3 首页横幅聚合「当天、当前用户可见课程」的 ScheduleChange；多条取最新未软删；软删恢复原状（不进横幅）；指向用户当天课表里没有的 slot 的变更不进横幅。对应 §6.6 **D**「学生首页出现调课横幅」「撤回后不再出现」。

**Files:**
- Create: `src/lib/queries/banner.ts`
- Test: `src/lib/queries/banner.integration.test.ts`

**Steps:**

- [ ] 写失败的集成测试 `src/lib/queries/banner.integration.test.ts`：

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getTodayBanner } from "./banner";
import { FIXTURE } from "./_fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL!;
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD!;

let studentClient: SupabaseClient;
beforeAll(async () => {
  studentClient = createClient(url, anon);
  const { error } = await studentClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });
  if (error) throw error;
});

describe("getTodayBanner (integration, local seed)", () => {
  it("location 变更日：横幅含一条该课变更，附 changeId 与课名", async () => {
    const now = new Date("2026-03-04T01:00:00Z");
    const items = await getTodayBanner(studentClient, now);
    const hit = items.find((i) => i.changeId === FIXTURE.changeLocationId);
    expect(hit).toBeDefined();
    expect(hit!.courseName).toBe("城市漫游");
    expect(hit!.message).toContain("创客空间");
  });

  it("无变更的日子：横幅为空数组（前端整条不渲染）", async () => {
    const now = new Date("2026-03-05T01:00:00Z"); // 周四，无锚点变更
    const items = await getTodayBanner(studentClient, now);
    expect(items.find((i) => i.changeId === FIXTURE.changeLocationId)).toBeUndefined();
  });

  it("cancelled 变更日：横幅含 changeType=cancelled 的条目", async () => {
    const now = new Date("2026-03-11T01:00:00Z");
    const items = await getTodayBanner(studentClient, now);
    const hit = items.find((i) => i.changeId === FIXTURE.changeCancelledId);
    expect(hit).toBeDefined();
    expect(hit!.changeType).toBe("cancelled");
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/lib/queries/banner.integration.test.ts`

- [ ] 写实现 `src/lib/queries/banner.ts`：

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { shanghaiToday, shanghaiWeekday } from "@/lib/time/shanghai";
import { pickEffectiveChange, type RawChange, type ChangeType } from "./schedule.logic";

export interface BannerItem {
  changeId: string;
  slotId: string;
  courseId: string | null;
  courseName: string | null;
  startsAt: string; // 原 slot 开始时间 HH:MM，用于横幅 "{时间} {课名}"
  changeType: ChangeType;
  message: string;
}

/**
 * 横幅 = 当天、当前用户当天课表里出现的 slot 上、最新未软删的 ScheduleChange。
 * 指向用户当天没有的 slot 的变更不进横幅（先按今天 weekday 的 slot 过滤）。
 */
export async function getTodayBanner(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<BannerItem[]> {
  const weekday = shanghaiWeekday(now);
  const today = shanghaiToday(now);

  const { data: term } = await supabase.from("Term").select("id").eq("is_active", true).maybeSingle();
  if (!term) return [];

  // 今天 weekday 的 slot（带课名与开始时间），作为"用户当天课表"的范围
  const { data: slots, error: slotErr } = await supabase
    .from("ScheduleSlot")
    .select(`id, course_id, starts_at, Course:course_id ( id, name )`)
    .eq("term_id", term.id)
    .eq("weekday", weekday);
  if (slotErr) throw slotErr;
  if (!slots || slots.length === 0) return [];

  const slotMeta = new Map(
    slots.map((s) => {
      const course = (s as { Course?: { id: string; name: string } }).Course;
      return [
        s.id as string,
        {
          courseId: (s.course_id as string | null) ?? null,
          courseName: course?.name ?? null,
          startsAt: (s.starts_at as string).slice(0, 5),
        },
      ];
    }),
  );
  const slotIds = [...slotMeta.keys()];

  const { data: changes, error: changeErr } = await supabase
    .from("ScheduleChange")
    .select(
      `id, slot_id, occurs_on, change_type, message, new_location,
       new_starts_at, new_ends_at, published_at, deleted_at`,
    )
    .in("slot_id", slotIds)
    .eq("occurs_on", today);
  if (changeErr) throw changeErr;

  const bySlot = new Map<string, RawChange[]>();
  for (const c of (changes ?? []) as RawChange[]) {
    const arr = bySlot.get(c.slot_id) ?? [];
    arr.push(c);
    bySlot.set(c.slot_id, arr);
  }

  const items: BannerItem[] = [];
  for (const [slotId, list] of bySlot) {
    const eff = pickEffectiveChange(list);
    if (!eff) continue; // 全软删 → 不进横幅（恢复原状）
    const meta = slotMeta.get(slotId)!;
    items.push({
      changeId: eff.id,
      slotId,
      courseId: meta.courseId,
      courseName: meta.courseName,
      startsAt: meta.startsAt,
      changeType: eff.change_type,
      message: eff.message,
    });
  }
  // 按原 slot 开始时间排序，横幅顺序与课表一致
  items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return items;
}
```

- [ ] 跑测试看通过：`npm run test -- src/lib/queries/banner.integration.test.ts`

- [ ] commit：

```bash
git add src/lib/queries/banner.ts src/lib/queries/banner.integration.test.ts
git commit -m "feat(home): getTodayBanner aggregates visible same-day ScheduleChange

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6：`getHomeFeed()` 跨课程综合动态流数据层（集成测试，TDD）

**满足**：§2.1.3 课程综合动态流（真 `published` Post，按 `published_at` 倒序，首页截断 + 横滑课程头像筛选条数据）、§3.7（草稿不进流）、§4.4（为图生成 signed URL，跑 `post_is_readable` 由 RLS 兜底）。对应 §6.6 **B**「学生在首页综合动态流看到已发布动态；横滑头像筛选能筛到它；草稿看不到」。

**Files:**
- Create: `src/lib/queries/feed.ts`
- Test: `src/lib/queries/feed.integration.test.ts`

**Steps:**

- [ ] 在 `src/lib/queries/_fixtures.ts` 追加 Post 锚点常量（与 seed 对齐）：

```ts
export const FEED_FIXTURE = {
  publishedPostId: "00000000-0000-0000-0000-0000000p0001", // 城市漫游已发布帖
  publishedPostTitle: "城市的边角料",
  draftPostId: "00000000-0000-0000-0000-0000000d0001", // 城市漫游草稿帖（学生看不到）
} as const;
```

> seed 须保证：`publishedPostId` 是城市漫游一条 `published` Post（带 1+ 张 PostAsset image）；`draftPostId` 是同课一条 `draft` Post。这些行由 §6.1/§1.5 要求的 seed 提供，本任务只追加固定 id 便于断言（执行子智能体替换为合法 uuid 并同步 seed）。

- [ ] 写失败的集成测试 `src/lib/queries/feed.integration.test.ts`：

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getHomeFeed } from "./feed";
import { FEED_FIXTURE } from "./_fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function clientFor(email: string, password: string) {
  const c = createClient(url, anon);
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

let studentClient: SupabaseClient;
beforeAll(async () => {
  studentClient = await clientFor(process.env.TEST_STUDENT_EMAIL!, process.env.TEST_STUDENT_PASSWORD!);
});

describe("getHomeFeed (integration, local seed)", () => {
  it("学生看到已发布动态，按 published_at 倒序，含课名与摘要", async () => {
    const { items } = await getHomeFeed(studentClient, 10);
    const hit = items.find((i) => i.postId === FEED_FIXTURE.publishedPostId);
    expect(hit).toBeDefined();
    expect(hit!.title).toBe(FEED_FIXTURE.publishedPostTitle);
    expect(hit!.courseName).toBe("城市漫游");
    expect(typeof hit!.commentCount).toBe("number"); // 真实计数（可为 0）
    // 倒序：相邻两条 published_at 单调不增
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].publishedAt >= items[i].publishedAt).toBe(true);
    }
  });

  it("草稿帖绝不进首页流（RLS 兜底）", async () => {
    const { items } = await getHomeFeed(studentClient, 50);
    expect(items.find((i) => i.postId === FEED_FIXTURE.draftPostId)).toBeUndefined();
  });

  it("筛选条 courses 只含有已发布帖的可见课程，且含城市漫游", async () => {
    const { courses } = await getHomeFeed(studentClient, 50);
    expect(courses.find((c) => c.name === "城市漫游")).toBeDefined();
  });

  it("limit 截断生效（首页内嵌版）", async () => {
    const { items } = await getHomeFeed(studentClient, 2);
    expect(items.length).toBeLessThanOrEqual(2);
  });

  it("封面图：已发布帖若有 image 资产则给到签名 URL（非空字符串）", async () => {
    const { items } = await getHomeFeed(studentClient, 50);
    const hit = items.find((i) => i.postId === FEED_FIXTURE.publishedPostId);
    expect(hit!.coverUrl === null || hit!.coverUrl.length > 0).toBe(true);
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/lib/queries/feed.integration.test.ts`

- [ ] 写实现 `src/lib/queries/feed.ts`：

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { excerptFromMarkdown } from "./feed.logic";

export interface FeedItem {
  postId: string;
  courseId: string;
  courseName: string;
  courseShortName: string | null;
  courseAvatarUrl: string | null;
  title: string;
  excerpt: string;
  publishedAt: string; // ISO，用于排序断言
  relativeTimeAt: string; // 同 publishedAt，前端转相对时间
  commentCount: number;
  coverUrl: string | null;
  coverAlt: string | null;
}

export interface FeedCourseChip {
  id: string;
  name: string;
  shortName: string | null;
  avatarUrl: string | null;
}

export interface HomeFeed {
  items: FeedItem[];
  courses: FeedCourseChip[]; // 横滑筛选条：有已发布帖的可见课程
}

const SIGNED_URL_TTL = 60 * 30; // 30 分钟

/**
 * 跨课程综合动态流（首页截断版）：只取可读课程的 published Post，按 published_at 倒序，取前 limit 条。
 * 草稿由 RLS 过滤不会进来。为每条首图签发短时效 signed URL（RLS 已保证只有可读帖）。
 */
export async function getHomeFeed(supabase: SupabaseClient, limit: number): Promise<HomeFeed> {
  const { data: posts, error } = await supabase
    .from("Post")
    .select(
      `id, space_id, title, body_markdown, published_at,
       Course:space_id ( id, name, short_name, avatar_url ),
       PostAsset ( storage_key, sort_order, asset_type, deleted_at ),
       Comment ( id, deleted_at )`,
    )
    .eq("space_type", "course")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const items: FeedItem[] = [];
  const courseMap = new Map<string, FeedCourseChip>();

  for (const p of posts ?? []) {
    const course = (p as { Course?: { id: string; name: string; short_name: string | null; avatar_url: string | null } }).Course;
    if (!course) continue; // 防御：course 被删/不可读

    // 评论真实计数（排除软删）
    const comments = ((p as { Comment?: { id: string; deleted_at: string | null }[] }).Comment ?? [])
      .filter((c) => c.deleted_at === null);

    // 封面 = 最小 sort_order 的未软删 image 资产
    const assets = ((p as { PostAsset?: { storage_key: string; sort_order: number; asset_type: string; deleted_at: string | null }[] }).PostAsset ?? [])
      .filter((a) => a.deleted_at === null && a.asset_type === "image")
      .sort((a, b) => a.sort_order - b.sort_order);

    let coverUrl: string | null = null;
    if (assets.length > 0) {
      const { data: signed } = await supabase.storage
        .from("post-assets")
        .createSignedUrl(assets[0].storage_key, SIGNED_URL_TTL);
      coverUrl = signed?.signedUrl ?? null;
    }

    items.push({
      postId: p.id as string,
      courseId: course.id,
      courseName: course.name,
      courseShortName: course.short_name,
      courseAvatarUrl: course.avatar_url,
      title: p.title as string,
      excerpt: excerptFromMarkdown(p.body_markdown as string | null, 80),
      publishedAt: p.published_at as string,
      relativeTimeAt: p.published_at as string,
      commentCount: comments.length,
      coverUrl,
      coverAlt: coverUrl ? `${course.name}：${p.title}` : null,
    });

    if (!courseMap.has(course.id)) {
      courseMap.set(course.id, {
        id: course.id,
        name: course.name,
        shortName: course.short_name,
        avatarUrl: course.avatar_url,
      });
    }
  }

  return { items, courses: [...courseMap.values()] };
}
```

- [ ] 跑测试看通过：`npm run test -- src/lib/queries/feed.integration.test.ts`

- [ ] commit：

```bash
git add src/lib/queries/feed.ts src/lib/queries/feed.integration.test.ts src/lib/queries/_fixtures.ts
git commit -m "feat(home): getHomeFeed cross-course published feed + filter chips + signed covers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7：`getRecentActivity()` 最近社区动态派生数据层（集成测试，TDD）

**满足**：§2.1.5 最近社区动态（派生自真 `Post`+`Comment`，「最近有人在……」时间线，只读、无假数字、无「N 人在线」）；空态走 §2.1.6 empty。对应 §6.6 **E**「最近社区动态是真派生、无假数字」。

**Files:**
- Create: `src/lib/queries/activity.ts`
- Test: `src/lib/queries/activity.integration.test.ts`

**Steps:**

- [ ] 写失败的集成测试 `src/lib/queries/activity.integration.test.ts`：

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRecentActivity } from "./activity";
import { FEED_FIXTURE } from "./_fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let studentClient: SupabaseClient;
beforeAll(async () => {
  studentClient = createClient(url, anon);
  const { error } = await studentClient.auth.signInWithPassword({
    email: process.env.TEST_STUDENT_EMAIL!,
    password: process.env.TEST_STUDENT_PASSWORD!,
  });
  if (error) throw error;
});

describe("getRecentActivity (integration, local seed)", () => {
  it("合成 post+comment 时间线，按时间倒序，每条带类型/课程归属/链接", async () => {
    const items = await getRecentActivity(studentClient, 10);
    expect(items.length).toBeGreaterThan(0);
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].at >= items[i].at).toBe(true);
    }
    const types = new Set(items.map((i) => i.kind));
    expect([...types].every((t) => t === "post" || t === "comment")).toBe(true);
    // 每条都能点进对应动态详情
    items.forEach((i) => {
      expect(i.href).toMatch(/^\/courses\/.+\/posts\/.+$/);
    });
  });

  it("含已发布帖派生的 post 活动（城市漫游已发布帖）", async () => {
    const items = await getRecentActivity(studentClient, 50);
    expect(items.find((i) => i.kind === "post" && i.postId === FEED_FIXTURE.publishedPostId)).toBeDefined();
  });

  it("不包含草稿帖派生的活动", async () => {
    const items = await getRecentActivity(studentClient, 50);
    expect(items.find((i) => i.postId === FEED_FIXTURE.draftPostId)).toBeUndefined();
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/lib/queries/activity.integration.test.ts`

- [ ] 写实现 `src/lib/queries/activity.ts`：

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActivityItem {
  kind: "post" | "comment";
  actorName: string;
  actorAvatarUrl: string | null;
  courseName: string;
  postId: string;
  courseId: string;
  postTitle: string;
  at: string; // ISO，倒序排序
  href: string; // 进对应动态详情
}

/**
 * 最近社区动态（只读派生）：最近 published Post（谁在某课发了）+ 最近 Comment（谁评论了哪条），
 * 合成一条按时间倒序的时间线。无 "N 人在线" 等假数字（§2.1.5）。RLS 保证草稿/不可读内容不进来。
 */
export async function getRecentActivity(supabase: SupabaseClient, limit: number): Promise<ActivityItem[]> {
  // 最近已发布帖
  const { data: posts, error: postErr } = await supabase
    .from("Post")
    .select(
      `id, title, published_at, space_id,
       Author:author_id ( display_name, avatar_url ),
       Course:space_id ( id, name )`,
    )
    .eq("space_type", "course")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (postErr) throw postErr;

  // 最近评论（带其父帖与课程，RLS 已保证父帖可读）
  const { data: comments, error: commentErr } = await supabase
    .from("Comment")
    .select(
      `id, created_at, post_id,
       Author:author_id ( display_name, avatar_url ),
       Post:post_id ( id, title, space_id, status, deleted_at,
                      Course:space_id ( id, name ) )`,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (commentErr) throw commentErr;

  const items: ActivityItem[] = [];

  for (const p of posts ?? []) {
    const author = (p as { Author?: { display_name: string; avatar_url: string | null } }).Author;
    const course = (p as { Course?: { id: string; name: string } }).Course;
    if (!author || !course) continue;
    items.push({
      kind: "post",
      actorName: author.display_name,
      actorAvatarUrl: author.avatar_url,
      courseName: course.name,
      postId: p.id as string,
      courseId: course.id,
      postTitle: p.title as string,
      at: p.published_at as string,
      href: `/courses/${course.id}/posts/${p.id}`,
    });
  }

  for (const c of comments ?? []) {
    const author = (c as { Author?: { display_name: string; avatar_url: string | null } }).Author;
    const post = (c as {
      Post?: { id: string; title: string; status: string; deleted_at: string | null; Course?: { id: string; name: string } };
    }).Post;
    if (!author || !post || post.status !== "published" || post.deleted_at !== null || !post.Course) continue;
    items.push({
      kind: "comment",
      actorName: author.display_name,
      actorAvatarUrl: author.avatar_url,
      courseName: post.Course.name,
      postId: post.id,
      courseId: post.Course.id,
      postTitle: post.title,
      at: c.created_at as string,
      href: `/courses/${post.Course.id}/posts/${post.id}`,
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items.slice(0, limit);
}
```

- [ ] 跑测试看通过：`npm run test -- src/lib/queries/activity.integration.test.ts`

- [ ] commit：

```bash
git add src/lib/queries/activity.ts src/lib/queries/activity.integration.test.ts
git commit -m "feat(home): getRecentActivity derives community timeline from posts+comments

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8：相对时间纯函数（TDD，供横幅/动态卡/活动流共用）

**满足**：§2.1.3 动态卡相对时间、§2.1.5 活动「· 2h」。集中一个纯函数，CC 渲染时调用。

**Files:**
- Test: `src/lib/time/relative.test.ts`
- Create: `src/lib/time/relative.ts`

**Steps:**

- [ ] 写失败测试 `src/lib/time/relative.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { relativeTime } from "./relative";

const now = new Date("2026-03-04T10:00:00Z");

describe("relativeTime", () => {
  it("小于 1 分钟 → 刚刚", () => {
    expect(relativeTime("2026-03-04T09:59:40Z", now)).toBe("刚刚");
  });
  it("分钟级", () => {
    expect(relativeTime("2026-03-04T09:30:00Z", now)).toBe("30 分钟前");
  });
  it("小时级", () => {
    expect(relativeTime("2026-03-04T08:00:00Z", now)).toBe("2 小时前");
  });
  it("天级", () => {
    expect(relativeTime("2026-03-02T10:00:00Z", now)).toBe("2 天前");
  });
  it("超过 7 天 → 上海本地日期", () => {
    expect(relativeTime("2026-02-01T10:00:00Z", now)).toBe("2026-02-01");
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/lib/time/relative.test.ts`

- [ ] 写实现 `src/lib/time/relative.ts`：

```ts
import { shanghaiToday } from "./shanghai";

/** 把 ISO 时间转成中文相对时间；超过 7 天回落到上海本地日期。 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "刚刚";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day <= 7) return `${day} 天前`;
  return shanghaiToday(new Date(iso));
}
```

- [ ] 跑测试看通过：`npm run test -- src/lib/time/relative.test.ts`

- [ ] commit：

```bash
git add src/lib/time/relative.ts src/lib/time/relative.test.ts
git commit -m "feat(home): relativeTime helper for feed/banner/activity timestamps

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9：调课横幅 Client Component（按 `ScheduleChange.id` 记本地已读，组件测试 TDD）

**满足**：§2.3 横幅「知道了」已读（key=`ScheduleChange.id`，带 `user_id` 前缀，纯本地态，SSR 渲染全部未读、hydrate 后收起；localStorage 不可用降级为每次都显示；诚实标「本地已读、不跨设备」）。对应 §6.6 **D**「横幅按 id 记已读，刷新不无故重弹」。

**Files:**
- Create: `src/app/(shell)/_components/NoticeBanner.tsx`
- Create: `src/app/(shell)/_components/NoticeBanner.module.css`
- Test: `src/app/(shell)/_components/NoticeBanner.test.tsx`

**Steps:**

- [ ] 写失败的组件测试 `src/app/(shell)/_components/NoticeBanner.test.tsx`：

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoticeBanner } from "./NoticeBanner";
import type { BannerItem } from "@/lib/queries/banner";

const items: BannerItem[] = [
  { changeId: "chg-1", slotId: "s1", courseId: "c1", courseName: "城市漫游", startsAt: "09:00", changeType: "location", message: "改到 创客空间" },
  { changeId: "chg-2", slotId: "s2", courseId: "c2", courseName: "问题与方法", startsAt: "11:00", changeType: "cancelled", message: "今天停课" },
];

beforeEach(() => {
  localStorage.clear();
});

describe("NoticeBanner", () => {
  it("渲染两条变更，每条含课名与 message", () => {
    render(<NoticeBanner items={items} userId="u1" />);
    expect(screen.getByText(/城市漫游/)).toBeInTheDocument();
    expect(screen.getByText(/改到 创客空间/)).toBeInTheDocument();
    expect(screen.getByText(/今天停课/)).toBeInTheDocument();
  });

  it('点"知道了"按 changeId 记 localStorage 并收起该条', () => {
    render(<NoticeBanner items={items} userId="u1" />);
    const dismissBtns = screen.getAllByRole("button", { name: /知道了/ });
    fireEvent.click(dismissBtns[0]);
    expect(screen.queryByText(/改到 创客空间/)).not.toBeInTheDocument();
    expect(localStorage.getItem("haoqi.bannerRead.u1.chg-1")).toBe("1");
    // 另一条仍在
    expect(screen.getByText(/今天停课/)).toBeInTheDocument();
  });

  it("已在 localStorage 标记已读的条目 hydrate 后不显示", () => {
    localStorage.setItem("haoqi.bannerRead.u1.chg-1", "1");
    render(<NoticeBanner items={items} userId="u1" />);
    expect(screen.queryByText(/改到 创客空间/)).not.toBeInTheDocument();
    expect(screen.getByText(/今天停课/)).toBeInTheDocument();
  });

  it("已读 key 带 userId 前缀，换账号互不影响", () => {
    localStorage.setItem("haoqi.bannerRead.u1.chg-1", "1");
    render(<NoticeBanner items={items} userId="u2" />);
    // u2 没标记过 → chg-1 仍显示
    expect(screen.getByText(/改到 创客空间/)).toBeInTheDocument();
  });

  it("全部已读 → 整条横幅不渲染（无空白条）", () => {
    localStorage.setItem("haoqi.bannerRead.u1.chg-1", "1");
    localStorage.setItem("haoqi.bannerRead.u1.chg-2", "1");
    const { container } = render(<NoticeBanner items={items} userId="u1" />);
    expect(container.querySelector('[data-testid="notice-banner"]')).toBeNull();
  });

  it("空 items → 不渲染", () => {
    const { container } = render(<NoticeBanner items={[]} userId="u1" />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/app/(shell)/_components/NoticeBanner.test.tsx`

- [ ] 写实现 `src/app/(shell)/_components/NoticeBanner.tsx`：

```tsx
"use client";

import { useEffect, useState } from "react";
import type { BannerItem } from "@/lib/queries/banner";
import styles from "./NoticeBanner.module.css";

const KEY_PREFIX = "haoqi.bannerRead";

function readKey(userId: string, changeId: string): string {
  return `${KEY_PREFIX}.${userId}.${changeId}`;
}

interface Props {
  items: BannerItem[];
  userId: string;
}

/**
 * 调课横幅：SSR 时渲染全部"未读"，hydrate 后按 localStorage 收起已读（避免读 localStorage 的 hydration 闪烁）。
 * 已读 key = changeId（不用内容），带 userId 前缀做账号隔离。localStorage 不可用 → 降级为每次都显示。
 */
export function NoticeBanner({ items, userId }: Props) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // 仅客户端读 localStorage，首屏 SSR 不读 → 全部未读
  useEffect(() => {
    try {
      const next = new Set<string>();
      for (const it of items) {
        if (localStorage.getItem(readKey(userId, it.changeId)) === "1") next.add(it.changeId);
      }
      setReadIds(next);
    } catch {
      // localStorage 不可用 → 保持空集（每次都显示），不阻塞
    }
  }, [items, userId]);

  function dismiss(changeId: string) {
    try {
      localStorage.setItem(readKey(userId, changeId), "1");
    } catch {
      // 写失败也照样收起本次会话
    }
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(changeId);
      return next;
    });
  }

  const visible = items.filter((it) => !readIds.has(it.changeId));
  if (visible.length === 0) return null;

  return (
    <div className={styles.banner} role="status" data-testid="notice-banner">
      <ul className={styles.list}>
        {visible.map((it) => (
          <li key={it.changeId} className={styles.row}>
            <span className={styles.time}>{it.startsAt}</span>
            <span className={styles.course}>{it.courseName ?? "课程"}</span>
            <span className={styles.message}>{it.message}</span>
            <button
              type="button"
              className={styles.dismiss}
              aria-label={`知道了：${it.courseName ?? "课程"} 的调课`}
              onClick={() => dismiss(it.changeId)}
            >
              知道了
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.hint}>本地已读，不跨设备</p>
    </div>
  );
}
```

- [ ] 写 `src/app/(shell)/_components/NoticeBanner.module.css`（珊瑚语义色 = 变更，引全局 token，§2.3/§4.5）：

```css
.banner {
  background: color-mix(in srgb, var(--coral) 12%, var(--white));
  border: 1px solid color-mix(in srgb, var(--coral) 40%, var(--line));
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  color: var(--ink);
  font-size: 0.95rem;
}
.time {
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--navy);
}
.course {
  font-weight: 600;
  color: var(--navy);
}
.message {
  color: var(--coral);
}
.dismiss {
  margin-left: auto;
  border: 1px solid var(--line);
  background: var(--white);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--ink);
}
.dismiss:hover {
  background: var(--paper);
}
.hint {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--ink) 55%, transparent);
}
```

- [ ] 跑测试看通过：`npm run test -- src/app/(shell)/_components/NoticeBanner.test.tsx`

- [ ] commit：

```bash
git add "src/app/(shell)/_components/NoticeBanner.tsx" "src/app/(shell)/_components/NoticeBanner.module.css" "src/app/(shell)/_components/NoticeBanner.test.tsx"
git commit -m "feat(home): NoticeBanner with per-id local read tracking and account isolation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10：今天的课卡 Server Component（含行变体 + 标红 + 空态）

**满足**：§2.1.2 今天的切片各行变体（`.now`/将来/`.changed` 珊瑚标红/`cancelled` 置灰删除线/选修标签/free 时段禁用 `＋`），保留课程入口；§2.1.6 empty。对应 §6.6 **D**「课表卡片标红、入口仍在」。

> 该卡片是 SC（渲染静态结构，无 onClick），相对时间用 Task 8 纯函数在 SC 内直接算（传入服务端 now）。`＋` 禁用钮符合诚实纪律（§2.1.2 / §4.6）。

**Files:**
- Create: `src/app/(shell)/_components/TodayScheduleCard.tsx`
- Create: `src/app/(shell)/_components/TodayScheduleCard.module.css`
- Test: `src/app/(shell)/_components/TodayScheduleCard.test.tsx`

**Steps:**

- [ ] 写失败的组件测试 `src/app/(shell)/_components/TodayScheduleCard.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TodayScheduleCard } from "./TodayScheduleCard";
import type { TodayScheduleRow } from "@/lib/queries/schedule";

function row(over: Partial<TodayScheduleRow>): TodayScheduleRow {
  return {
    slotId: "s1", courseId: "c1", courseName: "城市漫游",
    startsAt: "09:00", endsAt: "10:30", location: "教室一", note: null,
    semanticColor: "blue", changed: false, cancelled: false,
    changeId: null, changeType: null, changeMessage: null,
    status: "upcoming", minutesUntil: 30, slotKind: "required",
    ...over,
  };
}

describe("TodayScheduleCard", () => {
  it("空态：无课时显示留白文案 + 进课程入口", () => {
    render(<TodayScheduleCard rows={[]} />);
    expect(screen.getByText(/今天没有排课/)).toBeInTheDocument();
  });

  it("changed 行：珊瑚 change-tag + 变更后地点，且课程链接仍在", () => {
    render(<TodayScheduleCard rows={[row({ changed: true, location: "创客空间", changeType: "location", changeMessage: "改到 创客空间" })]} />);
    const r = screen.getByTestId("class-row-s1");
    expect(within(r).getByText(/创客空间/)).toBeInTheDocument();
    expect(within(r).getByTestId("change-tag")).toBeInTheDocument();
    expect(within(r).getByRole("link", { name: /查看课程/ })).toHaveAttribute("href", "/courses/c1");
  });

  it("cancelled 行：muted + 删除线标题 + 今日停课标签，入口仍可点", () => {
    render(<TodayScheduleCard rows={[row({ cancelled: true, changed: true, changeType: "cancelled", changeMessage: "今天停课" })]} />);
    const r = screen.getByTestId("class-row-s1");
    expect(within(r).getByText(/今日停课/)).toBeInTheDocument();
    expect(within(r).getByRole("link", { name: /查看课程/ })).toHaveAttribute("href", "/courses/c1");
  });

  it("正在发生：显示 正在发生 标记", () => {
    render(<TodayScheduleCard rows={[row({ status: "now", minutesUntil: null })]} />);
    expect(screen.getByText(/正在发生/)).toBeInTheDocument();
  });

  it("将来：显示 还有 N 分钟（刷新更新）", () => {
    render(<TodayScheduleCard rows={[row({ status: "upcoming", minutesUntil: 30 })]} />);
    expect(screen.getByText(/还有 30 分钟/)).toBeInTheDocument();
  });

  it("大选修槽：显示标签 + 中性占位措辞，不伪造课名", () => {
    render(<TodayScheduleCard rows={[row({ slotKind: "large_elective", courseId: null, courseName: null })]} />);
    expect(screen.getByText(/大选修/)).toBeInTheDocument();
    expect(screen.getByText(/具体选修课待选课结果公布后映射/)).toBeInTheDocument();
  });

  it("free 时段：＋ 钮为禁用态并带 aria-label 说明", () => {
    render(<TodayScheduleCard rows={[row({ slotKind: "free", courseId: null, courseName: null })]} />);
    const add = screen.getByRole("button", { name: /我的一周.*建设中/ });
    expect(add).toBeDisabled();
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/app/(shell)/_components/TodayScheduleCard.test.tsx`

- [ ] 写实现 `src/app/(shell)/_components/TodayScheduleCard.tsx`：

```tsx
import Link from "next/link";
import type { TodayScheduleRow } from "@/lib/queries/schedule";
import styles from "./TodayScheduleCard.module.css";

const ELECTIVE_LABEL: Record<string, string> = {
  large_elective: "大选修",
  small_elective: "小选修",
};
const ELECTIVE_HINT = "具体选修课待选课结果公布后映射";

interface Props {
  rows: TodayScheduleRow[];
}

/** 今天的切片（SC）：渲染今天官方课表各行，叠加调课变体；课程入口在任何分支都保留。 */
export function TodayScheduleCard({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <section className={styles.card} aria-label="今天的课">
        <h2 className={styles.title}>今天的切片</h2>
        <p className={styles.empty}>
          今天没有排课，去做点不实用的事。 <Link href="/courses" className={styles.emptyLink}>去看看课程 →</Link>
        </p>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-label="今天的课">
      <h2 className={styles.title}>今天的切片</h2>
      <ul className={styles.list}>
        {rows.map((r) => {
          const isElective = r.slotKind === "large_elective" || r.slotKind === "small_elective";
          const isFree = r.slotKind === "free";
          const rowClass = [
            styles.row,
            r.status === "now" ? styles.now : "",
            r.changed && !r.cancelled ? styles.changed : "",
            r.cancelled ? styles.muted : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li key={r.slotId} className={rowClass} data-testid={`class-row-${r.slotId}`}>
              <span className={styles.time}>
                {r.startsAt}–{r.endsAt}
              </span>
              <span className={styles.swatch} data-color={r.semanticColor} aria-hidden="true" />
              <span className={styles.body}>
                {isElective ? (
                  <>
                    <span className={styles.name}>{ELECTIVE_LABEL[r.slotKind]}</span>
                    <span className={styles.sub}>{ELECTIVE_HINT}</span>
                  </>
                ) : isFree ? (
                  <>
                    <span className={styles.name}>自由发生</span>
                    <span className={styles.sub}>留一扇门开着</span>
                  </>
                ) : (
                  <>
                    <span className={r.cancelled ? styles.nameCancelled : styles.name}>{r.courseName ?? "课程"}</span>
                    <span className={styles.sub}>
                      {r.cancelled ? (
                        <span className={styles.cancelTag}>今日停课</span>
                      ) : r.changed ? (
                        <span className={styles.changeTag} data-testid="change-tag">
                          {r.location ?? r.changeMessage}
                        </span>
                      ) : (
                        r.location ?? ""
                      )}
                      {r.note ? <span className={styles.note}> · {r.note}</span> : null}
                    </span>
                  </>
                )}
              </span>
              <span className={styles.statusText}>
                {r.status === "now" ? "正在发生（刷新更新）" : r.status === "upcoming" && r.minutesUntil !== null ? `还有 ${r.minutesUntil} 分钟（刷新更新）` : ""}
              </span>
              {isFree ? (
                <button
                  type="button"
                  className={styles.addDisabled}
                  disabled
                  aria-label="为时段添加计划属『我的一周』，建设中"
                >
                  ＋
                </button>
              ) : r.courseId ? (
                <Link href={`/courses/${r.courseId}`} className={styles.action}>
                  → 查看课程
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] 写 `src/app/(shell)/_components/TodayScheduleCard.module.css`：

```css
.card {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.25rem;
}
.title {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  color: var(--navy);
}
.empty {
  color: color-mix(in srgb, var(--ink) 70%, transparent);
  font-size: 0.95rem;
}
.emptyLink {
  color: var(--navy);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--line);
  flex-wrap: wrap;
}
.now {
  background: color-mix(in srgb, var(--yellow) 14%, transparent);
  border-radius: var(--radius);
  padding-inline: 0.5rem;
}
.changed {
  background: color-mix(in srgb, var(--coral) 8%, transparent);
  border-radius: var(--radius);
  padding-inline: 0.5rem;
}
.muted {
  opacity: 0.6;
}
.time {
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--navy);
  white-space: nowrap;
}
.swatch {
  width: 10px;
  height: 24px;
  border-radius: 4px;
  background: var(--blue);
}
.swatch[data-color="yellow"] { background: var(--yellow); }
.swatch[data-color="coral"] { background: var(--coral); }
.swatch[data-color="mint"] { background: var(--mint); }
.swatch[data-color="pink"] { background: var(--pink); }
.body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.name {
  font-weight: 600;
  color: var(--navy);
}
.nameCancelled {
  font-weight: 600;
  color: var(--navy);
  text-decoration: line-through;
}
.sub {
  font-size: 0.85rem;
  color: color-mix(in srgb, var(--ink) 65%, transparent);
}
.changeTag { color: var(--coral); }
.cancelTag { color: var(--coral); font-weight: 600; }
.note { color: color-mix(in srgb, var(--ink) 65%, transparent); }
.statusText {
  font-size: 0.8rem;
  color: var(--navy);
  white-space: nowrap;
}
.action {
  color: var(--navy);
  white-space: nowrap;
  font-size: 0.9rem;
}
.addDisabled {
  border: 1px dashed var(--line);
  background: var(--paper);
  color: color-mix(in srgb, var(--ink) 45%, transparent);
  border-radius: 999px;
  width: 1.8rem;
  height: 1.8rem;
  cursor: not-allowed;
}
```

- [ ] 跑测试看通过：`npm run test -- src/app/(shell)/_components/TodayScheduleCard.test.tsx`

- [ ] commit：

```bash
git add "src/app/(shell)/_components/TodayScheduleCard.tsx" "src/app/(shell)/_components/TodayScheduleCard.module.css" "src/app/(shell)/_components/TodayScheduleCard.test.tsx"
git commit -m "feat(home): TodayScheduleCard with row variants, red-flag change, free-slot disabled add

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11：综合动态流 + 横滑课程头像筛选 Client Component（组件测试 TDD）

**满足**：§2.1.3 横滑课程头像筛选条（「全部 N」+ 每门有已发布帖的可见课程一颗 chip，点击只在客户端过滤已取流、不跳页、窄屏不溢出）、动态卡（课名/相对时间/标题/摘要/封面/`💬 n`）、§4.2（CC 只过滤已取数据不重新请求）。对应 §6.6 **B**「首页综合动态流看到已发布动态；横滑头像筛选能筛到它」。

**Files:**
- Create: `src/app/(shell)/_components/HomeFeed.tsx`
- Create: `src/app/(shell)/_components/HomeFeed.module.css`
- Test: `src/app/(shell)/_components/HomeFeed.test.tsx`

**Steps:**

- [ ] 写失败的组件测试 `src/app/(shell)/_components/HomeFeed.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { HomeFeed } from "./HomeFeed";
import type { FeedItem, FeedCourseChip } from "@/lib/queries/feed";

const courses: FeedCourseChip[] = [
  { id: "c1", name: "城市漫游", shortName: "城", avatarUrl: null },
  { id: "c2", name: "问题与方法", shortName: "问", avatarUrl: null },
];
const items: FeedItem[] = [
  { postId: "p1", courseId: "c1", courseName: "城市漫游", courseShortName: "城", courseAvatarUrl: null, title: "城市的边角料", excerpt: "走了很久", publishedAt: "2026-03-04T09:00:00Z", relativeTimeAt: "2026-03-04T09:00:00Z", commentCount: 2, coverUrl: null, coverAlt: null },
  { postId: "p2", courseId: "c2", courseName: "问题与方法", courseShortName: "问", courseAvatarUrl: null, title: "怎么问一个好问题", excerpt: "先别急着答", publishedAt: "2026-03-03T09:00:00Z", relativeTimeAt: "2026-03-03T09:00:00Z", commentCount: 0, coverUrl: null, coverAlt: null },
];

describe("HomeFeed", () => {
  it('默认"全部 N"选中，渲染全部条目', () => {
    render(<HomeFeed items={items} courses={courses} />);
    expect(screen.getByRole("button", { name: /全部 2/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("城市的边角料")).toBeInTheDocument();
    expect(screen.getByText("怎么问一个好问题")).toBeInTheDocument();
  });

  it("点课程 chip 只过滤已取流，不跳页，仅显示该课条目", () => {
    render(<HomeFeed items={items} courses={courses} />);
    fireEvent.click(screen.getByRole("button", { name: /城市漫游/ }));
    expect(screen.getByText("城市的边角料")).toBeInTheDocument();
    expect(screen.queryByText("怎么问一个好问题")).not.toBeInTheDocument();
  });

  it("动态卡链接进对应动态详情", () => {
    render(<HomeFeed items={items} courses={courses} />);
    const card = screen.getByTestId("feed-item-p1");
    expect(within(card).getByRole("link")).toHaveAttribute("href", "/courses/c1/posts/p1");
  });

  it("评论数显示真实计数（可为 0）", () => {
    render(<HomeFeed items={items} courses={courses} />);
    expect(within(screen.getByTestId("feed-item-p2")).getByText(/💬 0/)).toBeInTheDocument();
  });

  it("empty：无条目走空态文案 + 去课程入口", () => {
    render(<HomeFeed items={[]} courses={[]} />);
    expect(screen.getByText(/最近还没有课程更新/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /去看看课程/ })).toHaveAttribute("href", "/courses");
  });

  it("筛到的课无条目时显示该筛选下空态，不串别课", () => {
    const only = [items[0]];
    render(<HomeFeed items={only} courses={courses} />);
    fireEvent.click(screen.getByRole("button", { name: /问题与方法/ }));
    expect(screen.getByText(/这门课最近还没有更新/)).toBeInTheDocument();
  });
});
```

- [ ] 跑测试看它失败：`npm run test -- src/app/(shell)/_components/HomeFeed.test.tsx`

- [ ] 写实现 `src/app/(shell)/_components/HomeFeed.tsx`：

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { FeedItem, FeedCourseChip } from "@/lib/queries/feed";
import { relativeTime } from "@/lib/time/relative";
import styles from "./HomeFeed.module.css";

interface Props {
  items: FeedItem[];
  courses: FeedCourseChip[];
}

const ALL = "__all__";

/** 综合动态流（CC）：横滑头像筛选只在客户端过滤已取流，不重新请求、不跳页（§2.1.3 / §4.2）。 */
export function HomeFeed({ items, courses }: Props) {
  const [filter, setFilter] = useState<string>(ALL);

  if (items.length === 0) {
    return (
      <section className={styles.feed} aria-label="课程正在发生">
        <h2 className={styles.title}>课程正在发生</h2>
        <p className={styles.empty}>
          最近还没有课程更新。 <Link href="/courses" className={styles.emptyLink}>去看看课程 →</Link>
        </p>
      </section>
    );
  }

  const shown = filter === ALL ? items : items.filter((i) => i.courseId === filter);

  return (
    <section className={styles.feed} aria-label="课程正在发生">
      <div className={styles.head}>
        <h2 className={styles.title}>课程正在发生</h2>
        <Link href="/courses" className={styles.allLink}>全部动态 →</Link>
      </div>

      <div className={styles.filter} role="group" aria-label="按课程筛选动态">
        <button
          type="button"
          className={styles.chip}
          aria-pressed={filter === ALL}
          data-active={filter === ALL}
          onClick={() => setFilter(ALL)}
        >
          全部 {courses.length}
        </button>
        {courses.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.chip}
            aria-pressed={filter === c.id}
            data-active={filter === c.id}
            aria-label={`只看 ${c.name}`}
            onClick={() => setFilter(c.id)}
          >
            {c.avatarUrl ? (
              <img className={styles.chipAvatar} src={c.avatarUrl} alt="" />
            ) : (
              <span className={styles.chipFallback} aria-hidden="true">{c.shortName ?? c.name.slice(0, 1)}</span>
            )}
            <span className={styles.chipName}>{c.name}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className={styles.empty}>这门课最近还没有更新。</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((it) => (
            <li key={it.postId} className={styles.item} data-testid={`feed-item-${it.postId}`}>
              <Link href={`/courses/${it.courseId}/posts/${it.postId}`} className={styles.itemLink}>
                <div className={styles.itemHead}>
                  {it.courseAvatarUrl ? (
                    <img className={styles.smallAvatar} src={it.courseAvatarUrl} alt="" />
                  ) : (
                    <span className={styles.smallFallback} aria-hidden="true">{it.courseShortName ?? it.courseName.slice(0, 1)}</span>
                  )}
                  <span className={styles.courseName}>{it.courseName}</span>
                  <span className={styles.time}>{relativeTime(it.relativeTimeAt)}</span>
                </div>
                <h3 className={styles.itemTitle}>{it.title}</h3>
                {it.excerpt ? <p className={styles.excerpt}>{it.excerpt}</p> : null}
                <div className={styles.itemFoot}>
                  {it.coverUrl ? <img className={styles.cover} src={it.coverUrl} alt={it.coverAlt ?? ""} /> : null}
                  <span className={styles.comments}>💬 {it.commentCount}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] 写 `src/app/(shell)/_components/HomeFeed.module.css`：

```css
.feed {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.25rem;
}
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.title {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  color: var(--navy);
}
.allLink { color: var(--navy); font-size: 0.9rem; }
.filter {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  margin-bottom: 0.75rem;
  scrollbar-width: thin;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
  border: 1px solid var(--line);
  background: var(--paper);
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  cursor: pointer;
  color: var(--ink);
  white-space: nowrap;
}
.chip[data-active="true"] {
  background: var(--navy);
  color: var(--white);
  border-color: var(--navy);
}
.chipAvatar, .smallAvatar {
  width: 1.4rem; height: 1.4rem; border-radius: 50%; object-fit: cover;
}
.chipFallback, .smallFallback {
  width: 1.4rem; height: 1.4rem; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--blue); color: var(--white); font-size: 0.7rem;
}
.chipName { font-size: 0.85rem; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.item { border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.itemLink { display: block; padding: 0.85rem; color: inherit; text-decoration: none; }
.itemHead { display: flex; align-items: center; gap: 0.5rem; }
.courseName { font-size: 0.85rem; color: var(--navy); font-weight: 600; }
.time { margin-left: auto; font-size: 0.8rem; color: color-mix(in srgb, var(--ink) 55%, transparent); }
.itemTitle { margin: 0.5rem 0 0.25rem; font-size: 1rem; color: var(--navy); }
.excerpt { margin: 0; font-size: 0.9rem; color: color-mix(in srgb, var(--ink) 75%, transparent); }
.itemFoot { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
.cover { width: 3rem; height: 3rem; border-radius: 8px; object-fit: cover; }
.comments { font-size: 0.85rem; color: color-mix(in srgb, var(--ink) 65%, transparent); }
.empty { color: color-mix(in srgb, var(--ink) 70%, transparent); font-size: 0.95rem; }
.emptyLink { color: var(--navy); }
```

- [ ] 跑测试看通过：`npm run test -- src/app/(shell)/_components/HomeFeed.test.tsx`

- [ ] commit：

```bash
git add "src/app/(shell)/_components/HomeFeed.tsx" "src/app/(shell)/_components/HomeFeed.module.css" "src/app/(shell)/_components/HomeFeed.test.tsx"
git commit -m "feat(home): HomeFeed client component with course avatar filter (client-side only)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12：最近社区动态只读卡 + 积分/阅读诚实占位卡（SC，组件测试 TDD）

**满足**：§2.1.5 最近社区动态只读（头像+课程归属+相对时间+进详情链接；空态「社区还很安静」；无假数字）；§2.1.4 积分/阅读诚实占位（大数字替「—/建设中」+ 小字「建设中」+ 箭头进占位页）。对应 §6.6 **E**「最近社区动态真派生无假数字；积分/阅读诚实占位」。

**Files:**
- Create: `src/app/(shell)/_components/RecentActivityCard.tsx`
- Create: `src/app/(shell)/_components/PlaceholderCards.tsx`
- Create: `src/app/(shell)/_components/SideCards.module.css`
- Test: `src/app/(shell)/_components/RecentActivityCard.test.tsx`
- Test: `src/app/(shell)/_components/PlaceholderCards.test.tsx`

**Steps:**

- [ ] 写失败的组件测试 `src/app/(shell)/_components/RecentActivityCard.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { RecentActivityCard } from "./RecentActivityCard";
import type { ActivityItem } from "@/lib/queries/activity";

const items: ActivityItem[] = [
  { kind: "post", actorName: "林元", actorAvatarUrl: null, courseName: "城市漫游", postId: "p1", courseId: "c1", postTitle: "城市的边角料", at: "2026-03-04T08:00:00Z", href: "/courses/c1/posts/p1" },
  { kind: "comment", actorName: "思齐", actorAvatarUrl: null, courseName: "问题与方法", postId: "p2", courseId: "c2", postTitle: "怎么问一个好问题", at: "2026-03-04T07:00:00Z", href: "/courses/c2/posts/p2" },
];

describe("RecentActivityCard", () => {
  it("post 活动文案：谁在某课发了，链接到详情", () => {
    render(<RecentActivityCard items={items} />);
    const row = screen.getByTestId("activity-p1-post");
    expect(within(row).getByText(/林元/)).toBeInTheDocument();
    expect(within(row).getByText(/城市漫游/)).toBeInTheDocument();
    expect(within(row).getByRole("link")).toHaveAttribute("href", "/courses/c1/posts/p1");
  });

  it("comment 活动文案：谁评论了哪条", () => {
    render(<RecentActivityCard items={items} />);
    const row = screen.getByTestId("activity-p2-comment");
    expect(within(row).getByText(/思齐/)).toBeInTheDocument();
    expect(within(row).getByText(/评论/)).toBeInTheDocument();
  });

  it("不出现 N 人在线 等假数字", () => {
    render(<RecentActivityCard items={items} />);
    expect(screen.queryByText(/人在线/)).not.toBeInTheDocument();
    expect(screen.queryByText(/正在看/)).not.toBeInTheDocument();
  });

  it("empty：社区还很安静", () => {
    render(<RecentActivityCard items={[]} />);
    expect(screen.getByText(/社区还很安静/)).toBeInTheDocument();
  });
});
```

- [ ] 写失败的组件测试 `src/app/(shell)/_components/PlaceholderCards.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditPlaceholderCard, ReadingPlaceholderCard } from "./PlaceholderCards";

describe("Placeholder cards", () => {
  it("积分卡：不出现 98/100 等假数字，标注建设中，箭头进占位页", () => {
    render(<CreditPlaceholderCard />);
    expect(screen.queryByText(/98/)).not.toBeInTheDocument();
    expect(screen.getByText(/积分系统建设中/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/credits");
  });

  it("阅读卡：不出现 2h40m 等假数字，标注建设中，箭头进占位页", () => {
    render(<ReadingPlaceholderCard />);
    expect(screen.queryByText(/2h40m/)).not.toBeInTheDocument();
    expect(screen.getByText(/阅读联赛建设中/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/reading");
  });
});
```

- [ ] 跑两个测试看它失败：`npm run test -- "src/app/(shell)/_components/RecentActivityCard.test.tsx" "src/app/(shell)/_components/PlaceholderCards.test.tsx"`

- [ ] 写实现 `src/app/(shell)/_components/RecentActivityCard.tsx`：

```tsx
import Link from "next/link";
import type { ActivityItem } from "@/lib/queries/activity";
import { relativeTime } from "@/lib/time/relative";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./SideCards.module.css";

interface Props {
  items: ActivityItem[];
}

/** 最近社区动态（SC，只读派生）：头像 + 课程归属 + 相对时间，进对应详情；无假数字（§2.1.5）。 */
export function RecentActivityCard({ items }: Props) {
  return (
    <section className={styles.card} aria-label="最近社区动态">
      <h2 className={styles.title}>最近社区动态</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>社区还很安静，等第一条动态。</p>
      ) : (
        <ul className={styles.activityList}>
          {items.map((it) => (
            <li key={`${it.kind}-${it.postId}-${it.at}`} className={styles.activityRow} data-testid={`activity-${it.postId}-${it.kind}`}>
              <Link href={it.href} className={styles.activityLink}>
                <Avatar name={it.actorName} avatarUrl={it.actorAvatarUrl} size={28} />
                <span className={styles.activityText}>
                  <strong>{it.actorName}</strong>{" "}
                  {it.kind === "post" ? (
                    <>在『{it.courseName}』发了新动态</>
                  ) : (
                    <>评论了『{it.courseName}』的动态</>
                  )}
                </span>
                <span className={styles.activityTime}>{relativeTime(it.at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] 写实现 `src/app/(shell)/_components/PlaceholderCards.tsx`：

```tsx
import Link from "next/link";
import styles from "./SideCards.module.css";

/** 信用积分诚实占位卡（§2.1.4）：保留视觉气质，大数字替"—"，标注建设中。 */
export function CreditPlaceholderCard() {
  return (
    <section className={`${styles.card} ${styles.scoreCard}`} aria-label="信用积分（建设中）">
      <div className={styles.cardHead}>
        <h2 className={styles.title}>信用积分</h2>
        <Link href="/credits" className={styles.arrow} aria-label="进入信用积分（建设中）">→</Link>
      </div>
      <p className={styles.bigNumber} aria-hidden="true">—</p>
      <p className={styles.buildingHint}>积分系统建设中，示例数据不作真实统计。</p>
    </section>
  );
}

/** 阅读联赛诚实占位卡（§2.1.4）。 */
export function ReadingPlaceholderCard() {
  return (
    <section className={`${styles.card} ${styles.readingCard}`} aria-label="阅读联赛（建设中）">
      <div className={styles.cardHead}>
        <h2 className={styles.title}>阅读联赛</h2>
        <Link href="/reading" className={styles.arrow} aria-label="进入阅读联赛（建设中）">→</Link>
      </div>
      <p className={styles.bigNumber} aria-hidden="true">—</p>
      <p className={styles.buildingHint}>阅读联赛建设中，示例数据不作真实统计。</p>
    </section>
  );
}
```

- [ ] 写 `src/app/(shell)/_components/SideCards.module.css`（保留原型积分卡 `rotate(-1deg)` 手工感，§4.5）：

```css
.card {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.1rem;
  margin-bottom: 1rem;
}
.cardHead { display: flex; align-items: baseline; justify-content: space-between; }
.title { margin: 0 0 0.5rem; font-size: 1rem; color: var(--navy); }
.arrow { color: var(--navy); text-decoration: none; font-size: 1.1rem; }
.empty { color: color-mix(in srgb, var(--ink) 70%, transparent); font-size: 0.9rem; }

.activityList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.activityRow { font-size: 0.88rem; }
.activityLink { display: flex; align-items: center; gap: 0.5rem; color: inherit; text-decoration: none; }
.activityText { color: var(--ink); min-width: 0; flex: 1; }
.activityText strong { color: var(--navy); }
.activityTime { font-size: 0.75rem; color: color-mix(in srgb, var(--ink) 55%, transparent); white-space: nowrap; }

.scoreCard { background: color-mix(in srgb, var(--yellow) 16%, var(--white)); transform: rotate(-1deg); }
.readingCard { background: color-mix(in srgb, var(--blue) 12%, var(--white)); }
.bigNumber { font-size: 2rem; margin: 0.25rem 0; color: color-mix(in srgb, var(--ink) 40%, transparent); }
.buildingHint { margin: 0; font-size: 0.78rem; color: color-mix(in srgb, var(--ink) 60%, transparent); }
```

- [ ] 跑两个测试看通过：`npm run test -- "src/app/(shell)/_components/RecentActivityCard.test.tsx" "src/app/(shell)/_components/PlaceholderCards.test.tsx"`

- [ ] commit：

```bash
git add "src/app/(shell)/_components/RecentActivityCard.tsx" "src/app/(shell)/_components/PlaceholderCards.tsx" "src/app/(shell)/_components/SideCards.module.css" "src/app/(shell)/_components/RecentActivityCard.test.tsx" "src/app/(shell)/_components/PlaceholderCards.test.tsx"
git commit -m "feat(home): RecentActivity read-only card + honest credit/reading placeholders

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13：首页 Server Component 组装（HERO + 横幅 + 课卡 + 流 + 侧卡 + loading/error）

**满足**：§2.1.1 屏幕构成、§2.1.6 六态（loading 骨架 / empty / error 就地可重试 / no-permission=N/A / draft=N/A / published）、§4.2（SC 顶层 await 取数，交互收敛到 CC 叶子）。把前面所有数据层 + 组件接到 `page.tsx`。对应 §6.6 **B/D/E** 在首页的部分。

> HERO 周次用前置 `getActiveTermWeek()`；天气球按开放问题默认保留为纯装饰、无温度数字、无实时 aria。删除原型「N 件正在长出来的事」无来源数字。error 用 try/catch 包每块取数，单块失败就地降级为 `StateBlock variant="error"`，不整页崩。loading 用 `loading.tsx` 骨架。

**Files:**
- Create: `src/app/(shell)/page.tsx`
- Create: `src/app/(shell)/loading.tsx`
- Create: `src/app/(shell)/error.tsx`
- Create: `src/app/(shell)/_components/Hero.tsx`
- Create: `src/app/(shell)/_components/Hero.module.css`
- Create: `src/app/(shell)/home.module.css`

**Steps:**

- [ ] 写 HERO Server Component `src/app/(shell)/_components/Hero.tsx`（静态问候 + 真周次 + N 节课退化文案 + 纯装饰天气球）：

```tsx
import styles from "./Hero.module.css";

const WEEKDAY_CN = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

interface Props {
  termName: string;
  weekIndex: number; // 第 N 周
  weekday: number; // 1..7
  classCount: number;
}

/** 首页 HERO（SC）：真 Term 周次 + N 节课退化文案；天气球纯装饰、无温度数字、无实时 aria（§2.1.1）。 */
export function Hero({ termName, weekIndex, weekday, classCount }: Props) {
  const classLine = classCount === 0 ? "今天没有排课，留给自己。" : `今天有 ${classCount} 节课。`;
  return (
    <header className={styles.hero}>
      <div className={styles.heroText}>
        <p className={styles.term}>{termName} · 第 {weekIndex} 周</p>
        <h1 className={styles.greeting}>{WEEKDAY_CN[weekday]}，慢一点也没关系。</h1>
        <p className={styles.classLine}>{classLine}</p>
      </div>
      <div className={styles.orb} role="img" aria-label="装饰图，非实时天气" />
    </header>
  );
}
```

- [ ] 写 `src/app/(shell)/_components/Hero.module.css`（保留原型天气球不规则 border-radius，§4.5）：

```css
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.heroText { min-width: 0; }
.term { margin: 0 0 0.25rem; font-size: 0.85rem; color: var(--navy); letter-spacing: 0.04em; }
.greeting { margin: 0 0 0.35rem; font-size: 1.6rem; color: var(--navy); }
.classLine { margin: 0; color: color-mix(in srgb, var(--ink) 75%, transparent); }
.orb {
  flex: 0 0 auto;
  width: 84px;
  height: 84px;
  background: radial-gradient(circle at 35% 30%, var(--yellow), var(--coral));
  border-radius: 56% 44% 60% 40% / 48% 60% 40% 52%;
}
@media (max-width: 720px) {
  .hero { flex-direction: column; align-items: flex-start; }
}
```

- [ ] 写 `src/app/(shell)/home.module.css`（2 列 dashboard 网格，窄屏单列不溢出，§2.5）：

```css
.grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}
.left { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }
.right { display: flex; flex-direction: column; min-width: 0; }
@media (max-width: 720px) {
  .grid { grid-template-columns: 1fr; }
}
```

- [ ] 写主页面 `src/app/(shell)/page.tsx`（顶层 SC，await 取数，逐块 try/catch 降级，no-permission/draft 标 N/A）：

```tsx
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTermWeek } from "@/lib/term";
import { getTodaySchedule } from "@/lib/queries/schedule";
import { getTodayBanner } from "@/lib/queries/banner";
import { getHomeFeed } from "@/lib/queries/feed";
import { getRecentActivity } from "@/lib/queries/activity";
import { shanghaiWeekday } from "@/lib/time/shanghai";
import { Hero } from "./_components/Hero";
import { NoticeBanner } from "./_components/NoticeBanner";
import { TodayScheduleCard } from "./_components/TodayScheduleCard";
import { HomeFeed } from "./_components/HomeFeed";
import { RecentActivityCard } from "./_components/RecentActivityCard";
import { CreditPlaceholderCard, ReadingPlaceholderCard } from "./_components/PlaceholderCards";
import { StateBlock } from "@/components/ui/StateBlock";
import styles from "./home.module.css";

// 首页含个性化（按登录用户 RLS），禁用静态缓存。
export const dynamic = "force-dynamic";

const HOME_FEED_LIMIT = 6;
const RECENT_ACTIVITY_LIMIT = 6;

export default async function HomePage() {
  const user = await getCurrentUser(); // middleware 已挡未登录；这里 user 必非空
  if (!user) {
    // 兜底：理论不可达（middleware 前置），不渲染业务数据
    return <StateBlock variant="error" title="需要登录" message="请重新登录后查看此刻。" />;
  }

  const supabase = await createClient();
  const now = new Date();

  // 各块独立取数 + 就地降级，一块失败不拖垮整页（§2.1.6 error）
  const week = await safe(() => getActiveTermWeek(supabase, now));
  const schedule = await safe(() => getTodaySchedule(supabase, now));
  const banner = await safe(() => getTodayBanner(supabase, now));
  const feed = await safe(() => getHomeFeed(supabase, HOME_FEED_LIMIT));
  const activity = await safe(() => getRecentActivity(supabase, RECENT_ACTIVITY_LIMIT));

  return (
    <div>
      {week.ok ? (
        <Hero
          termName={week.value.termName}
          weekIndex={week.value.weekIndex}
          weekday={shanghaiWeekday(now)}
          classCount={schedule.ok ? schedule.value.length : 0}
        />
      ) : (
        <StateBlock variant="error" title="加载失败" message="顶部信息没加载出来。" />
      )}

      {/* 横幅取数失败 → 不显示横幅（宁缺勿误导，§2.3）；为空 → NoticeBanner 自身不渲染 */}
      {banner.ok ? <NoticeBanner items={banner.value} userId={user.id} /> : null}

      <div className={styles.grid}>
        <div className={styles.left}>
          {schedule.ok ? (
            <TodayScheduleCard rows={schedule.value} />
          ) : (
            <StateBlock variant="error" title="今天的课没加载出来" message="点这里重试" />
          )}
          {feed.ok ? (
            <HomeFeed items={feed.value.items} courses={feed.value.courses} />
          ) : (
            <StateBlock variant="error" title="动态没加载出来" message="点这里重试" />
          )}
        </div>
        <div className={styles.right}>
          {activity.ok ? (
            <RecentActivityCard items={activity.value} />
          ) : (
            <StateBlock variant="error" title="社区动态没加载出来" message="点这里重试" />
          )}
          <CreditPlaceholderCard />
          <ReadingPlaceholderCard />
        </div>
      </div>
    </div>
  );
}

type Result<T> = { ok: true; value: T } | { ok: false };
async function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch {
    return { ok: false };
  }
}
```

> 说明：`StateBlock` 的 error 变体可重试由前置组件实现（点击触发 `router.refresh()` 的 CC 包装，前面阶段已建）。本页只决定何时渲染 error 态。no-permission 在首页是 N/A（§2.1.6：被 RLS 过滤的内容根本到不了，不渲染红框）；draft 在首页是 N/A（流默认不含草稿）。

- [ ] 写 loading 骨架 `src/app/(shell)/loading.tsx`：

```tsx
import { StateBlock } from "@/components/ui/StateBlock";

/** 首页骨架（§2.1.6 loading）：数据未定前不闪现"无变化"，不先渲染假数据。 */
export default function HomeLoading() {
  return <StateBlock variant="loading" title="正在拼今天的切片…" message="" />;
}
```

- [ ] 写 error 边界 `src/app/(shell)/error.tsx`（整页级兜底，逐块降级之外的兜底）：

```tsx
"use client";

import { StateBlock } from "@/components/ui/StateBlock";

export default function HomeError({ reset }: { error: Error; reset: () => void }) {
  return <StateBlock variant="error" title="此刻没加载出来" message="点这里重试" onRetry={reset} />;
}
```

- [ ] 跑全量单元/组件测试确认无回归：`npm run test`

- [ ] 跑构建确认类型/RSC 边界正确：`npm run build`

- [ ] commit：

```bash
git add "src/app/(shell)/page.tsx" "src/app/(shell)/loading.tsx" "src/app/(shell)/error.tsx" "src/app/(shell)/home.module.css" "src/app/(shell)/_components/Hero.tsx" "src/app/(shell)/_components/Hero.module.css"
git commit -m "feat(home): assemble 此刻 homepage with hero, banner, schedule, feed, side cards, six states

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14：e2e 覆盖 §6.6 D（调课）+ B 首页部分（Playwright）

**满足**：§6.6 **D** 全部 4 条（横幅出现、课表标红、入口仍在、知道了按 id 记已读刷新不重弹）+ §6.6 **B** 首页部分（学生在首页综合动态流看到已发布动态、横滑头像筛选能筛到它、草稿看不到）。

> e2e 跑在本地 Supabase + seed 锚点数据上，用学生测试账号。为规避「跑测试当天恰好不是周三」的脆弱性，e2e 通过一个仅测试环境启用的「冻结时间」query 参数 `?__now=2026-03-04T01:00:00Z` 让首页 SC 用固定 now（实现见步骤；非测试环境忽略该参数）。

**Files:**
- Modify: `src/app/(shell)/page.tsx`（接受测试用冻结时间，仅 `E2E_FREEZE_TIME=1` 时生效）
- Create: `e2e/home-realdata.spec.ts`
- Create: `e2e/fixtures/auth.ts`（学生登录态复用，若前面阶段已建则复用其导出）

**Steps:**

- [ ] 在 `src/app/(shell)/page.tsx` 顶部把 `now` 的来源改为可被测试冻结（仅当环境开关开启时读 `__now`）。修改 `now` 定义处：

把
```tsx
  const supabase = await createClient();
  const now = new Date();
```
改为
```tsx
  const supabase = await createClient();
  const now = resolveNow();
```
并在文件底部 `safe` 函数旁追加：

```tsx
// 测试可冻结时间：仅当 E2E_FREEZE_TIME=1 时读 __now header（由 middleware 从 query 透传），
// 生产环境永远用真实 now，不接受外部时间注入。
function resolveNow(): Date {
  if (process.env.E2E_FREEZE_TIME === "1") {
    // 从 next/headers 读取，header 名见 middleware 透传约定
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { headers } = require("next/headers") as typeof import("next/headers");
    const h = headers();
    const frozen = (h as unknown as { get(k: string): string | null }).get?.("x-e2e-now");
    if (frozen) return new Date(frozen);
  }
  return new Date();
}
```

> 注：`middleware.ts`（前置阶段所有人共用文件，改它须按 §4.6 先开 issue）在 `E2E_FREEZE_TIME=1` 时把 `?__now=` 透传为 `x-e2e-now` 请求头。本任务只依赖该约定；若 middleware 尚未支持，执行子智能体开一个 `chore/e2e-freeze-time` issue 由地基负责人加 3 行透传，再继续。生产默认 `E2E_FREEZE_TIME` 不设，`resolveNow()` 恒等于 `new Date()`。

- [ ] 写 e2e `e2e/home-realdata.spec.ts`：

```ts
import { test, expect } from "@playwright/test";
import { loginAsStudent } from "./fixtures/auth";

const FROZEN_WED = "2026-03-04T01:00:00Z"; // 上海周三 09:00，命中 location 变更锚点

test.describe("首页此刻真数据（§6.6 D + B 首页部分）", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test("D: 调课横幅出现 + 课表标红 + 入口仍在 + 知道了按 id 记已读刷新不重弹", async ({ page }) => {
    await page.goto(`/?__now=${encodeURIComponent(FROZEN_WED)}`);

    // 横幅出现，含变更后地点
    const banner = page.getByTestId("notice-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("创客空间");

    // 课表卡片标红（change-tag）且显示变更后地点
    const changeTag = page.getByTestId("change-tag").first();
    await expect(changeTag).toBeVisible();
    await expect(changeTag).toContainText("创客空间");

    // 标红课程入口仍在，点进课程主页正常（不替换实体）
    const courseLink = page.getByRole("link", { name: /查看课程/ }).first();
    await expect(courseLink).toBeVisible();
    await courseLink.click();
    await expect(page).toHaveURL(/\/courses\/[^/]+$/);

    // 回首页，点"知道了"收起该条
    await page.goto(`/?__now=${encodeURIComponent(FROZEN_WED)}`);
    await page.getByRole("button", { name: /知道了/ }).first().click();
    await expect(page.getByTestId("notice-banner")).toContainText("创客空间", { timeout: 1000 }).catch(() => {});
    // 刷新后该条不再无故重弹（按 ScheduleChange.id 记已读）
    await page.reload();
    const stillThere = await page.getByText("改到 创客空间").count();
    expect(stillThere).toBe(0);
  });

  test("B(首页): 学生在综合动态流看到已发布帖，横滑头像筛选能筛到它，看不到草稿", async ({ page }) => {
    await page.goto(`/?__now=${encodeURIComponent(FROZEN_WED)}`);

    // 已发布帖标题可见（seed 锚点：城市的边角料）
    await expect(page.getByText("城市的边角料")).toBeVisible();

    // 草稿帖不可见（seed 草稿标题不会出现；用其专属标题断言）
    await expect(page.getByText("城市漫游 · 未发布草稿")).toHaveCount(0);

    // 横滑头像筛选：点"城市漫游" chip 仍能看到该帖
    await page.getByRole("button", { name: /只看 城市漫游/ }).click();
    await expect(page.getByText("城市的边角料")).toBeVisible();
  });
});
```

> 注：草稿断言用 seed 给草稿帖起的专属标题「城市漫游 · 未发布草稿」（执行子智能体须在 seed 里把 `draftPostId` 的 title 设为该值，与此断言一致）。

- [ ] 写/复用登录夹具 `e2e/fixtures/auth.ts`（若前置阶段已建同名导出则直接复用，不重复）：

```ts
import type { Page } from "@playwright/test";

const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL!;
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD!;

/** 用本地 seed 学生账号走密码登录（本地 Supabase 已为 seed 账号设密码登录通道，仅测试用）。 */
export async function loginAsStudent(page: Page): Promise<void> {
  await page.goto("/login?e2e=1"); // 测试登录页暴露密码登录入口
  await page.getByLabel("邮箱").fill(STUDENT_EMAIL);
  await page.getByLabel("密码").fill(STUDENT_PASSWORD);
  await page.getByRole("button", { name: /登录/ }).click();
  await page.waitForURL("/**");
}
```

> 注：magic link 不便在 e2e 自动化，本地用「seed 账号密码登录通道」（登录阶段已为本地环境预留 `?e2e=1` 密码登录）。生产仍走 magic link。若前置登录阶段未预留该通道，开 `chore/e2e-password-login` issue 由登录负责人补，再继续。

- [ ] 跑 e2e（需先 `supabase start` + `supabase db reset` 应用迁移与 seed，并以 `E2E_FREEZE_TIME=1` 起 dev/preview）：

```bash
E2E_FREEZE_TIME=1 npm run test:e2e -- e2e/home-realdata.spec.ts
```

- [ ] 全量回归 + 构建：`npm run test && npm run lint && npm run build`

- [ ] commit：

```bash
git add "src/app/(shell)/page.tsx" e2e/home-realdata.spec.ts e2e/fixtures/auth.ts
git commit -m "test(home): e2e for schedule-change banner/red-flag (D) and homepage feed (B)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

**阶段 4 完成定义**：`npm run test`（含 schedule.logic / feed.logic / shanghai / relative 单测 + schedule/banner/feed/activity 集成测试 + NoticeBanner/TodayScheduleCard/HomeFeed/RecentActivityCard/PlaceholderCards 组件测试）全绿；`npm run test:e2e` 的 D + B 首页用例全绿；`npm run lint && npm run build` 通过。满足 §6.6 **D** 全部、**B** 首页部分、**E** 首页占位/最近社区动态部分；守住不变量「调课不覆写实体、课程入口永驻、草稿不进首页流、无来源假数字一律删」。

---

本阶段计划文件相关绝对路径（供整合时引用）：
- spec 事实来源：`C:/Users/david/haoqi-online/docs/specs/2026-06-21-haoqi-online-first-slice-design.md`
- 本阶段产物均在 `C:/Users/david/haoqi-online/src/lib/{time,queries}/`、`C:/Users/david/haoqi-online/src/app/(shell)/`、`C:/Users/david/haoqi-online/e2e/`、`C:/Users/david/haoqi-online/supabase/seed.sql`

---

## 阶段 5：课程空间（列表 → 主页 → 详情 → 评论）

> 本阶段实现 spec §2.2（课程空间 UX）、§2.3（调课在课程模块呈现）、§3.7/3.8/3.9（Post/PostAsset/Comment 数据与 RLS）、§4.4（Storage 读图签名 URL）所规定的三级真数据屏 + 评论写闭环。
> **前置假设（由前面阶段交付，本阶段直接 import，不重复定义）：**
> - `lib/supabase/server.ts` 导出 `createClient()`（基于 cookies 的服务端客户端）；`lib/supabase/client.ts` 导出 `createClient()`（浏览器）；`lib/supabase/admin.ts` 导出 `createAdminClient()`（service-role，顶部 `import 'server-only'`）。
> - `lib/types.ts` 已导出 Supabase 生成的 `Database` 类型与业务别名 `Post / PostAsset / Comment / Course / Profile`（字段同 spec §3.7/3.8/3.9/3.3、§5.2）。
> - `lib/auth.ts` 导出 `getCurrentUser()`（返回 `{ id, role } | null`）。
> - migration 已建 `Post/PostAsset/Comment` 表 + RLS + 不可变列触发器 + `post_is_readable()/can_post_course()/course_role()` 函数 + Storage `post-assets` private bucket RLS（spec §3.0/§3.7/§3.8/§3.9/§3.10）。
> - `supabase/seed.sql` 已预置每门课若干 `published` Post + ≥1 条 `draft` Post + PostAsset（指向已放入 bucket 的图）+ Comment（spec §6.1）。
> - `components/ui/StateBlock.tsx` 导出 `<StateBlock variant="empty|error|no-permission" title message actionLabel onRetry href />`，`components/ui/Avatar.tsx` 导出 `<Avatar name avatarUrl size colorKey />`。
> - `app/globals.css` 已搬入 spec §4.5 的 `:root` token（`--ink --ink-soft --paper --white --line --yellow --lemon --blue --coral --mint --navy --pink --radius`）。
> - `vitest.config.ts`、`playwright.config.ts`、`npm run test`、`npm run test:e2e`、`npm run lint`、`npm run build` 已配好；测试用两个种子账号 `STUDENT_EMAIL/TEACHER_EMAIL`（env，见前面阶段登录测试夹具 `e2e/fixtures/auth.ts` 导出 `loginAs(page, role)`）。

> **覆盖的验收（spec §6.6）：** 本阶段满足 **B**（老师发帖[seed]→学生看见的三级页）、**C**（评论写闭环三态/防双提交/过期暂存）、**E**（课程主页/详情页的占位诚实：发帖入口=「发帖功能 v2」占位）、**G**（路由前进后退/深链/刷新可恢复）、**H**（四屏 loading/empty/error/no-permission，可触发 no-permission 演示）。引用产品不变量 §3.11 之 5（草稿可见性收口）、8（附件/评论继承父帖可见性）、4（全员可评、不可越权发帖）。

---

### Task 1：数据层 — 课程动态流取数 + 相对时间/摘要工具（含单元测试）

实现 spec §2.2.1（综合动态流按 `published_at` 倒序）、§2.1.3（摘要按字素簇截断、`💬 n` 真实计数）、§2.2.1「有新动态=最近 48h 内」无状态规则。先写失败测试再写实现（TDD）。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/lib/queries/courseFeed.ts`
- Create: `C:/Users/david/haoqi-online/src/lib/format/text.ts`
- Test: `C:/Users/david/haoqi-online/src/lib/format/text.test.ts`
- Test: `C:/Users/david/haoqi-online/src/lib/queries/courseFeed.test.ts`

- [ ] 写失败测试 `src/lib/format/text.test.ts`（纯函数，不碰 Supabase）：

```ts
import { describe, it, expect } from "vitest";
import { excerpt, isFresh, relativeTime } from "./text";

describe("excerpt", () => {
  it("returns short text unchanged", () => {
    expect(excerpt("城市漫游第一周", 80)).toBe("城市漫游第一周");
  });
  it("truncates by grapheme cluster and adds ellipsis", () => {
    const long = "好".repeat(120);
    const out = excerpt(long, 80);
    expect([...new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(out)].length).toBe(81);
    expect(out.endsWith("…")).toBe(true);
  });
  it("does not split an emoji", () => {
    const out = excerpt("👩‍👩‍👧‍👦".repeat(50), 3);
    expect(out.endsWith("…")).toBe(true);
    expect(out.includes("\uFFFD")).toBe(false);
  });
  it("returns empty string for null body", () => {
    expect(excerpt(null, 80)).toBe("");
  });
});

describe("isFresh", () => {
  it("true when published within freshness window", () => {
    const now = new Date("2026-06-21T12:00:00+08:00");
    expect(isFresh("2026-06-21T06:00:00+08:00", now, 48)).toBe(true);
  });
  it("false when older than window", () => {
    const now = new Date("2026-06-21T12:00:00+08:00");
    expect(isFresh("2026-06-18T06:00:00+08:00", now, 48)).toBe(false);
  });
  it("false for null published_at", () => {
    expect(isFresh(null, new Date(), 48)).toBe(false);
  });
});

describe("relativeTime", () => {
  it("renders minutes", () => {
    const now = new Date("2026-06-21T12:00:00+08:00");
    expect(relativeTime("2026-06-21T11:30:00+08:00", now)).toBe("30 分钟前");
  });
  it("renders hours", () => {
    const now = new Date("2026-06-21T12:00:00+08:00");
    expect(relativeTime("2026-06-21T09:00:00+08:00", now)).toBe("3 小时前");
  });
  it("renders 刚刚 under a minute", () => {
    const now = new Date("2026-06-21T12:00:00+08:00");
    expect(relativeTime("2026-06-21T11:59:40+08:00", now)).toBe("刚刚");
  });
  it("renders days", () => {
    const now = new Date("2026-06-21T12:00:00+08:00");
    expect(relativeTime("2026-06-19T12:00:00+08:00", now)).toBe("2 天前");
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/format/text.test.ts`（预期模块不存在/红）。

- [ ] 写最小实现 `src/lib/format/text.ts`：

```ts
const SEG = new Intl.Segmenter("zh", { granularity: "grapheme" });

/** 按字素簇安全截断纯文本，超出加省略号（spec §2.1.3）。 */
export function excerpt(body: string | null, max: number): string {
  if (!body) return "";
  const text = body.replace(/\s+/g, " ").trim();
  const clusters = [...SEG.segment(text)].map((s) => s.segment);
  if (clusters.length <= max) return clusters.join("");
  return clusters.slice(0, max).join("") + "…";
}

/** 该帖是否在 freshnessHours 小时内发布（无状态「有新动态」判定，spec §2.2.1）。 */
export function isFresh(publishedAt: string | null, now: Date, freshnessHours: number): boolean {
  if (!publishedAt) return false;
  const diffMs = now.getTime() - new Date(publishedAt).getTime();
  return diffMs >= 0 && diffMs <= freshnessHours * 3600_000;
}

/** 相对时间中文文案。 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffSec = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "刚刚";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/format/text.test.ts`。

- [ ] 写失败测试 `src/lib/queries/courseFeed.test.ts`（mock Supabase 客户端，断言取数函数的形状/排序/可见性映射，不连真库）：

```ts
import { describe, it, expect, vi } from "vitest";
import { getCourseFeed, getCoursesForFilter } from "./courseFeed";

function mockClient(rows: unknown[]) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq = vi.fn(() => ({ order, is: vi.fn(() => ({ order })) }));
  const is = vi.fn(() => ({ eq, order }));
  const select = vi.fn(() => ({ eq, is, order }));
  const from = vi.fn(() => ({ select }));
  return { from } as unknown as Parameters<typeof getCourseFeed>[0];
}

describe("getCourseFeed", () => {
  it("maps rows to FeedItem with excerpt and comment count", async () => {
    const rows = [
      {
        id: "p1",
        title: "城市漫游第一周",
        body_markdown: "我们去了" + "城".repeat(200),
        published_at: "2026-06-21T06:00:00+08:00",
        space_id: "c1",
        Course: { id: "c1", name: "城市漫游", short_name: "城", avatar_url: null },
        PostAsset: [{ storage_key: "posts/p1/a.jpg", sort_order: 0 }],
        Comment: [{ count: 3 }],
      },
    ];
    const client = mockClient(rows);
    const feed = await getCourseFeed(client, { now: new Date("2026-06-21T12:00:00+08:00") });
    expect(feed[0].postId).toBe("p1");
    expect(feed[0].courseName).toBe("城市漫游");
    expect(feed[0].commentCount).toBe(3);
    expect(feed[0].excerpt.endsWith("…")).toBe(true);
    expect(feed[0].coverKey).toBe("posts/p1/a.jpg");
    expect(feed[0].isFresh).toBe(true);
  });
  it("returns [] when query errors", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const client = { from: () => ({ select: () => ({ is: () => ({ eq: () => ({ order }), order }), order }) }) } as never;
    await expect(getCourseFeed(client, { now: new Date() })).rejects.toThrow("boom");
  });
});

describe("getCoursesForFilter", () => {
  it("sorts fresh courses first then by created order", async () => {
    const rows = [
      { id: "c1", name: "问题与方法", short_name: "问", avatar_url: null, created_at: "2026-01-01", latest: "2026-06-01T00:00:00+08:00" },
      { id: "c2", name: "城市漫游", short_name: "城", avatar_url: null, created_at: "2026-01-02", latest: "2026-06-21T10:00:00+08:00" },
    ];
    const client = { rpc: vi.fn().mockResolvedValue({ data: rows, error: null }) } as never;
    const chips = await getCoursesForFilter(client, { now: new Date("2026-06-21T12:00:00+08:00") });
    expect(chips.map((c) => c.id)).toEqual(["c2", "c1"]);
    expect(chips[0].hasNew).toBe(true);
    expect(chips[1].hasNew).toBe(false);
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/queries/courseFeed.test.ts`。

- [ ] 写最小实现 `src/lib/queries/courseFeed.ts`：

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { excerpt, isFresh } from "@/lib/format/text";

const FRESH_HOURS = 48;
const EXCERPT_LEN = 80;

export type FeedItem = {
  postId: string;
  courseId: string;
  courseName: string;
  courseShortName: string | null;
  courseAvatarUrl: string | null;
  title: string;
  excerpt: string;
  publishedAt: string;
  coverKey: string | null;
  commentCount: number;
  isFresh: boolean;
};

export type CourseChip = {
  id: string;
  name: string;
  shortName: string | null;
  avatarUrl: string | null;
  hasNew: boolean;
};

type Client = SupabaseClient<Database>;

/**
 * 跨所有可读课程的已发布 Post，按 published_at 倒序（spec §2.2.1）。
 * RLS 在服务端兜底：草稿/无权课程不会返回。
 */
export async function getCourseFeed(
  client: Client,
  opts: { now: Date; courseId?: string },
): Promise<FeedItem[]> {
  let q = client
    .from("Post")
    .select(
      "id, title, body_markdown, published_at, space_id, Course:space_id(id, name, short_name, avatar_url), PostAsset(storage_key, sort_order), Comment(count)",
    )
    .eq("space_type", "course")
    .eq("status", "published")
    .is("deleted_at", null);
  if (opts.courseId) q = q.eq("space_id", opts.courseId);
  const { data, error } = await q.order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row): FeedItem => {
    const course = (row as { Course: { id: string; name: string; short_name: string | null; avatar_url: string | null } }).Course;
    const assets = ((row as { PostAsset: { storage_key: string; sort_order: number }[] }).PostAsset ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
    const commentCount = ((row as { Comment: { count: number }[] }).Comment?.[0]?.count) ?? 0;
    return {
      postId: row.id as string,
      courseId: course.id,
      courseName: course.name,
      courseShortName: course.short_name,
      courseAvatarUrl: course.avatar_url,
      title: row.title as string,
      excerpt: excerpt(row.body_markdown as string | null, EXCERPT_LEN),
      publishedAt: row.published_at as string,
      coverKey: assets[0]?.storage_key ?? null,
      commentCount,
      isFresh: isFresh(row.published_at as string | null, opts.now, FRESH_HOURS),
    };
  });
}

/**
 * 课程头像筛选条：有新动态（最近 48h 有已发布 Post）靠前，其余按创建序。
 * 走 RPC `courses_with_latest_post`（migration 提供），返回每门可读课 + 该课最新已发布 published_at。
 */
export async function getCoursesForFilter(
  client: Client,
  opts: { now: Date },
): Promise<CourseChip[]> {
  const { data, error } = await client.rpc("courses_with_latest_post");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as {
    id: string;
    name: string;
    short_name: string | null;
    avatar_url: string | null;
    created_at: string;
    latest: string | null;
  }[];
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      shortName: r.short_name,
      avatarUrl: r.avatar_url,
      hasNew: isFresh(r.latest, opts.now, FRESH_HOURS),
      _latest: r.latest,
      _created: r.created_at,
    }))
    .sort((a, b) => {
      if (a.hasNew !== b.hasNew) return a.hasNew ? -1 : 1;
      if (a.hasNew && b.hasNew) return (b._latest ?? "").localeCompare(a._latest ?? "");
      return a._created.localeCompare(b._created);
    })
    .map(({ _latest, _created, ...chip }) => chip);
}
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/queries/courseFeed.test.ts src/lib/format/text.test.ts`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/lib/queries/courseFeed.ts src/lib/format/text.ts src/lib/queries/courseFeed.test.ts src/lib/format/text.test.ts
git commit -m "feat(course): 课程动态流取数 + 字素簇截断/新动态/相对时间工具（含单测）

满足 spec §2.2.1 排序与有新动态规则、§2.1.3 摘要截断；为 §6.6 B 铺路

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2：数据层 — RLS 集成测试（草稿可见性 / 全员可评 / 不可越权发帖）

实现 spec §3.11 不变量 4/5/8 的负样本断言（§6.6 I 的课程子集）。用 anon 客户端（学生身份）vs service-role 客户端对比断言，连本地 Supabase。这是行为安全，必须 TDD：先写断言，跑通真库才算 RLS 落地。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/lib/queries/__rls__/postVisibility.int.test.ts`
- Create: `C:/Users/david/haoqi-online/src/lib/queries/__rls__/helpers.ts`

- [ ] 写测试夹具 `src/lib/queries/__rls__/helpers.ts`（连本地 Supabase，登录种子学生、拿到 anon-with-session 客户端；service-role 客户端用于读「真相」）：

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** service-role 客户端：绕过 RLS，看「真相」。仅测试用。 */
export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(URL, SERVICE, { auth: { persistSession: false } });
}

/** 以种子用户邮箱登录，返回带其 session 的 anon 客户端（受 RLS 约束）。 */
export async function clientAs(email: string): Promise<SupabaseClient<Database>> {
  const c = createClient<Database>(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: process.env.SEED_TEST_PASSWORD! });
  if (error) throw new Error(`login ${email} failed: ${error.message}`);
  return c;
}

export const STUDENT = process.env.SEED_STUDENT_EMAIL!;
export const TEACHER = process.env.SEED_TEACHER_EMAIL!;
```

- [ ] 写失败测试 `src/lib/queries/__rls__/postVisibility.int.test.ts`：

```ts
import { describe, it, expect, beforeAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { adminClient, clientAs, STUDENT, TEACHER } from "./helpers";

let admin: SupabaseClient<Database>;
let student: SupabaseClient<Database>;
let teacher: SupabaseClient<Database>;
let draftPostId: string;
let publishedPostId: string;

beforeAll(async () => {
  admin = adminClient();
  student = await clientAs(STUDENT);
  teacher = await clientAs(TEACHER);
  // 取 seed 中的一条草稿与一条已发布（由 seed.sql 保证存在）
  const { data: draft } = await admin.from("Post").select("id").eq("status", "draft").is("deleted_at", null).limit(1).single();
  const { data: pub } = await admin.from("Post").select("id").eq("status", "published").is("deleted_at", null).limit(1).single();
  draftPostId = draft!.id;
  publishedPostId = pub!.id;
});

describe("草稿可见性收口（不变量 5）", () => {
  it("学生 select 草稿 Post 返回 0 行", async () => {
    const { data } = await student.from("Post").select("id").eq("id", draftPostId);
    expect(data).toEqual([]);
  });
  it("学生 select 草稿帖 PostAsset 返回 0 行（不变量 8）", async () => {
    const { data } = await student.from("PostAsset").select("id").eq("post_id", draftPostId);
    expect(data).toEqual([]);
  });
  it("学生 select 草稿帖 Comment 返回 0 行（不变量 8）", async () => {
    const { data } = await student.from("Comment").select("id").eq("post_id", draftPostId);
    expect(data).toEqual([]);
  });
  it("学生能 select 已发布 Post", async () => {
    const { data } = await student.from("Post").select("id").eq("id", publishedPostId);
    expect(data?.length).toBe(1);
  });
});

describe("不可越权发帖（不变量 4）", () => {
  it("学生 insert Post 被 RLS 拒", async () => {
    const { error } = await student.from("Post").insert({
      space_type: "course",
      space_id: (await admin.from("Course").select("id").limit(1).single()).data!.id,
      title: "我是学生硬发的",
      author_id: (await student.auth.getUser()).data.user!.id,
      status: "published",
    } as never);
    expect(error).not.toBeNull();
  });
});

describe("全员可评（不变量 4）", () => {
  it("学生能对已发布帖 insert Comment", async () => {
    const uid = (await student.auth.getUser()).data.user!.id;
    const { error } = await student.from("Comment").insert({ post_id: publishedPostId, author_id: uid, body: "rls test comment" } as never);
    expect(error).toBeNull();
  });
  it("学生不能对草稿帖 insert Comment", async () => {
    const uid = (await student.auth.getUser()).data.user!.id;
    const { error } = await student.from("Comment").insert({ post_id: draftPostId, author_id: uid, body: "should fail" } as never);
    expect(error).not.toBeNull();
  });
  it("学生不能把自己评论的 post_id 改成草稿帖（不变量 6/触发器冻结）", async () => {
    const uid = (await student.auth.getUser()).data.user!.id;
    const { data: mine } = await student.from("Comment").insert({ post_id: publishedPostId, author_id: uid, body: "to mutate" } as never).select("id").single();
    const { error } = await student.from("Comment").update({ post_id: draftPostId } as never).eq("id", mine!.id);
    expect(error).not.toBeNull();
  });
});

describe("老师可见自己课草稿", () => {
  it("teacher 能 select 本人负责课的草稿", async () => {
    const { data } = await teacher.from("Post").select("id").eq("id", draftPostId);
    expect(data?.length).toBe(1);
  });
});
```

- [ ] 跑测试看它（在 RLS 正确时）通过；若失败说明前面阶段 RLS/触发器有缺，回报对应阶段修复，不在此阶段改 migration：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/queries/__rls__/postVisibility.int.test.ts`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/lib/queries/__rls__/
git commit -m "test(rls): 课程帖草稿可见性/全员可评/不可越权发帖集成测试

覆盖 spec §3.11 不变量 4/5/8、§6.6 I 课程子集（anon vs service-role 对比断言）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3：组件 — CourseChipBar（横滑头像栏，进主页 + 原地筛选）+ 组件测试

实现 spec §2.2.1 头像栏：点头像进主页（主操作，`<Link>`），旁置「只看这门课」chip 原地筛选（次操作，回调）；有新动态小红点；可聚焦 + `aria-label`；横滑窄屏不溢出。先写组件测试（TDD）。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/components/post/CourseChipBar.tsx`
- Create: `C:/Users/david/haoqi-online/src/components/post/CourseChipBar.module.css`
- Test: `C:/Users/david/haoqi-online/src/components/post/CourseChipBar.test.tsx`

- [ ] 写失败测试 `src/components/post/CourseChipBar.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CourseChipBar } from "./CourseChipBar";
import type { CourseChip } from "@/lib/queries/courseFeed";

const chips: CourseChip[] = [
  { id: "c1", name: "城市漫游", shortName: "城", avatarUrl: null, hasNew: true },
  { id: "c2", name: "问题与方法", shortName: "问", avatarUrl: null, hasNew: false },
];

describe("CourseChipBar", () => {
  it("renders 全部 chip selected by default + one chip per course", () => {
    render(<CourseChipBar courses={chips} activeCourseId={null} onFilter={() => {}} />);
    expect(screen.getByRole("button", { name: /全部/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("城市漫游，有新动态")).toBeInTheDocument();
    expect(screen.getByLabelText("问题与方法，无新动态")).toBeInTheDocument();
  });
  it("avatar links to course home (主操作)", () => {
    render(<CourseChipBar courses={chips} activeCourseId={null} onFilter={() => {}} />);
    const link = screen.getByRole("link", { name: /城市漫游/ });
    expect(link).toHaveAttribute("href", "/courses/c1");
  });
  it("clicking 只看这门课 chip calls onFilter (次操作), not navigation", () => {
    const onFilter = vi.fn();
    render(<CourseChipBar courses={chips} activeCourseId={null} onFilter={onFilter} />);
    fireEvent.click(screen.getByRole("button", { name: "只看城市漫游" }));
    expect(onFilter).toHaveBeenCalledWith("c1");
  });
  it("全部 chip resets filter to null", () => {
    const onFilter = vi.fn();
    render(<CourseChipBar courses={chips} activeCourseId="c1" onFilter={onFilter} />);
    fireEvent.click(screen.getByRole("button", { name: /全部/ }));
    expect(onFilter).toHaveBeenCalledWith(null);
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/CourseChipBar.test.tsx`。

- [ ] 写实现 `src/components/post/CourseChipBar.tsx`：

```tsx
"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { CourseChip } from "@/lib/queries/courseFeed";
import styles from "./CourseChipBar.module.css";

type Props = {
  courses: CourseChip[];
  activeCourseId: string | null;
  onFilter: (courseId: string | null) => void;
};

export function CourseChipBar({ courses, activeCourseId, onFilter }: Props) {
  return (
    <div className={styles.bar} role="group" aria-label="课程筛选">
      <button
        type="button"
        className={styles.allChip}
        aria-pressed={activeCourseId === null}
        onClick={() => onFilter(null)}
      >
        全部 {courses.length}
      </button>
      {courses.map((c) => (
        <div key={c.id} className={styles.chipGroup}>
          <Link
            href={`/courses/${c.id}`}
            className={styles.avatarLink}
            aria-label={`${c.name}，${c.hasNew ? "有新动态" : "无新动态"}`}
          >
            <Avatar name={c.shortName ?? c.name} avatarUrl={c.avatarUrl} size={48} colorKey={c.id} />
            {c.hasNew && <span className={styles.dot} aria-hidden="true" />}
          </Link>
          <button
            type="button"
            className={styles.filterChip}
            data-active={activeCourseId === c.id}
            aria-pressed={activeCourseId === c.id}
            aria-label={`只看${c.name}`}
            onClick={() => onFilter(activeCourseId === c.id ? null : c.id)}
          >
            只看这门课
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] 写样式 `src/components/post/CourseChipBar.module.css`（从原型移植纸感，颜色引全局变量，横滑不溢出）：

```css
.bar {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  padding: 6px 2px 12px;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}
.allChip {
  flex: 0 0 auto;
  align-self: flex-start;
  border: 1px solid var(--line);
  background: var(--white);
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-soft);
}
.allChip[aria-pressed="true"] {
  background: var(--ink);
  color: var(--white);
  border-color: var(--ink);
}
.chipGroup {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.avatarLink {
  position: relative;
  display: inline-block;
  border-radius: 50%;
  text-decoration: none;
}
.avatarLink:focus-visible {
  outline: 2px solid var(--navy);
  outline-offset: 2px;
}
.dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--coral);
  border: 2px solid var(--paper);
}
.filterChip {
  border: 1px solid var(--line);
  background: var(--white);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-soft);
  white-space: nowrap;
}
.filterChip[data-active="true"] {
  background: var(--coral);
  border-color: var(--coral);
  color: var(--navy);
}
.filterChip:focus-visible {
  outline: 2px solid var(--navy);
  outline-offset: 2px;
}
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/CourseChipBar.test.tsx`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/components/post/CourseChipBar.tsx src/components/post/CourseChipBar.module.css src/components/post/CourseChipBar.test.tsx
git commit -m "feat(course): CourseChipBar 横滑头像栏（进主页 + 原地筛选 + 新动态点）

满足 spec §2.2.1 头像栏不二分交互；含组件测试

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4：组件 — PostFeed（动态流卡片列表，客户端筛选）+ 组件测试

实现 spec §2.1.3/§2.2.1 动态卡（课程小头像 + 课名 + 相对时间 ｜ 标题 ｜ 摘要 ｜ footer 封面 + `💬 n`），整卡链接进详情；接 CourseChipBar 的 `activeCourseId` 在客户端过滤已取流（不重新请求，spec §2.1.3「只在客户端过滤已取到的流」）。封面图用预签 URL（从 props 传入 `coverUrl`，由 server 端签好，见 Task 5）。先写组件测试。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/components/post/PostFeed.tsx`
- Create: `C:/Users/david/haoqi-online/src/components/post/PostFeed.module.css`
- Create: `C:/Users/david/haoqi-online/src/components/post/CourseFeedSection.tsx`
- Test: `C:/Users/david/haoqi-online/src/components/post/PostFeed.test.tsx`

- [ ] 写失败测试 `src/components/post/PostFeed.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CourseFeedSection } from "./CourseFeedSection";
import type { FeedItem } from "@/lib/queries/courseFeed";
import type { CourseChip } from "@/lib/queries/courseFeed";

const items: (FeedItem & { coverUrl: string | null })[] = [
  { postId: "p1", courseId: "c1", courseName: "城市漫游", courseShortName: "城", courseAvatarUrl: null, title: "第一周", excerpt: "我们走了很远", publishedAt: "2026-06-21T06:00:00+08:00", coverKey: "k1", commentCount: 2, isFresh: true, coverUrl: "https://signed/k1" },
  { postId: "p2", courseId: "c2", courseName: "问题与方法", courseShortName: "问", courseAvatarUrl: null, title: "提问的艺术", excerpt: "怎么问", publishedAt: "2026-06-20T06:00:00+08:00", coverKey: null, commentCount: 0, isFresh: false, coverUrl: null },
];
const chips: CourseChip[] = [
  { id: "c1", name: "城市漫游", shortName: "城", avatarUrl: null, hasNew: true },
  { id: "c2", name: "问题与方法", shortName: "问", avatarUrl: null, hasNew: false },
];

describe("CourseFeedSection", () => {
  it("renders all feed items with title, course name, comment count", () => {
    render(<CourseFeedSection items={items} courses={chips} now={new Date("2026-06-21T12:00:00+08:00").toISOString()} />);
    expect(screen.getByText("第一周")).toBeInTheDocument();
    expect(screen.getByText("提问的艺术")).toBeInTheDocument();
    expect(screen.getByText("💬 2")).toBeInTheDocument();
    expect(screen.getByText("💬 0")).toBeInTheDocument();
  });
  it("each card links to its detail page", () => {
    render(<CourseFeedSection items={items} courses={chips} now={new Date("2026-06-21T12:00:00+08:00").toISOString()} />);
    expect(screen.getByRole("link", { name: /第一周/ })).toHaveAttribute("href", "/courses/c1/posts/p1");
  });
  it("client filter narrows feed to selected course without removing chip bar", () => {
    render(<CourseFeedSection items={items} courses={chips} now={new Date("2026-06-21T12:00:00+08:00").toISOString()} />);
    fireEvent.click(screen.getByRole("button", { name: "只看城市漫游" }));
    expect(screen.getByText("第一周")).toBeInTheDocument();
    expect(screen.queryByText("提问的艺术")).not.toBeInTheDocument();
  });
  it("text-only post shows title-cover block instead of image", () => {
    render(<CourseFeedSection items={items} courses={chips} now={new Date("2026-06-21T12:00:00+08:00").toISOString()} />);
    expect(screen.getByTestId("title-cover-p2")).toBeInTheDocument();
    expect(screen.queryByTestId("title-cover-p1")).not.toBeInTheDocument();
  });
  it("shows empty state when no items", () => {
    render(<CourseFeedSection items={[]} courses={chips} now={new Date().toISOString()} />);
    expect(screen.getByText("课程们还很安静，等第一条动态")).toBeInTheDocument();
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/PostFeed.test.tsx`。

- [ ] 写实现 `src/components/post/PostFeed.tsx`（无状态展示卡，封面图/标题色块二选一）：

```tsx
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime } from "@/lib/format/text";
import type { FeedItem } from "@/lib/queries/courseFeed";
import styles from "./PostFeed.module.css";

export type FeedItemWithCover = FeedItem & { coverUrl: string | null };

/** 课程语义色块封面：用 courseId 派生稳定色（spec §2.2.3 纯文字封面=写标题的色块图）。 */
function coverColorVar(courseId: string): string {
  const palette = ["--yellow", "--blue", "--coral", "--mint", "--pink", "--lemon"];
  let h = 0;
  for (const ch of courseId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `var(${palette[h % palette.length]})`;
}

export function PostFeed({ items, now }: { items: FeedItemWithCover[]; now: Date }) {
  return (
    <div className={styles.feed}>
      {items.map((it) => (
        <Link key={it.postId} href={`/courses/${it.courseId}/posts/${it.postId}`} className={styles.item}>
          {it.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.cover} src={it.coverUrl} alt={`${it.title} 封面`} loading="lazy" />
          ) : (
            <div
              className={styles.titleCover}
              data-testid={`title-cover-${it.postId}`}
              style={{ background: coverColorVar(it.courseId) }}
            >
              <span className={styles.titleCoverText}>{it.title}</span>
            </div>
          )}
          <div className={styles.body}>
            <div className={styles.meta}>
              <Avatar name={it.courseShortName ?? it.courseName} avatarUrl={it.courseAvatarUrl} size={22} colorKey={it.courseId} />
              <span className={styles.courseName}>{it.courseName}</span>
              <span className={styles.time}>{relativeTime(it.publishedAt, now)}</span>
            </div>
            <h3 className={styles.title}>{it.title}</h3>
            {it.excerpt && <p className={styles.excerpt}>{it.excerpt}</p>}
            <div className={styles.foot}>
              <span className={styles.comments}>💬 {it.commentCount}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] 写客户端筛选壳 `src/components/post/CourseFeedSection.tsx`（CC：持 activeCourseId，把 server 取好的 items 在本地过滤；空态走 StateBlock）：

```tsx
"use client";

import { useState, useMemo } from "react";
import { CourseChipBar } from "./CourseChipBar";
import { PostFeed, type FeedItemWithCover } from "./PostFeed";
import { StateBlock } from "@/components/ui/StateBlock";
import type { CourseChip } from "@/lib/queries/courseFeed";

type Props = {
  items: FeedItemWithCover[];
  courses: CourseChip[];
  /** server 端传入的渲染时刻（ISO），保证相对时间 SSR/CSR 一致。 */
  now: string;
};

export function CourseFeedSection({ items, courses, now }: Props) {
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const nowDate = useMemo(() => new Date(now), [now]);
  const visible = useMemo(
    () => (activeCourseId ? items.filter((i) => i.courseId === activeCourseId) : items),
    [items, activeCourseId],
  );

  return (
    <section>
      <CourseChipBar courses={courses} activeCourseId={activeCourseId} onFilter={setActiveCourseId} />
      {visible.length === 0 ? (
        <StateBlock
          variant="empty"
          title="课程们还很安静，等第一条动态"
          message={activeCourseId ? "这门课还没有公开的动态，换一门看看。" : "最近还没有课程更新。"}
        />
      ) : (
        <PostFeed items={visible} now={nowDate} />
      )}
    </section>
  );
}
```

- [ ] 写样式 `src/components/post/PostFeed.module.css`：

```css
.feed {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
  margin-top: 8px;
}
.item {
  display: flex;
  flex-direction: column;
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(24, 36, 59, 0.08);
}
.item:focus-visible {
  outline: 2px solid var(--navy);
  outline-offset: 2px;
}
.cover {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}
.titleCover {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  padding: 18px;
}
.titleCoverText {
  font-weight: 800;
  font-size: 18px;
  line-height: 1.3;
  color: var(--navy);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.body {
  padding: 13px 14px 15px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.meta {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--ink-soft);
}
.courseName {
  font-weight: 700;
  color: var(--ink);
}
.time {
  margin-left: auto;
}
.title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.excerpt {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.foot {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--ink-soft);
  margin-top: 2px;
}
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/PostFeed.test.tsx`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/components/post/PostFeed.tsx src/components/post/PostFeed.module.css src/components/post/CourseFeedSection.tsx src/components/post/PostFeed.test.tsx
git commit -m "feat(course): PostFeed 动态卡 + CourseFeedSection 客户端筛选壳

满足 spec §2.1.3/§2.2.1 动态卡与本地筛选、纯文字色块封面、空态

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5：数据层 — 签名 URL 服务端工具（读图，先跑 post_is_readable）+ 单元测试

实现 spec §4.4/§3.10：为已发布且可读 Post 的图生成短时效 signed URL；签发前必须经 RLS。本切片用 `server.ts`（当前用户身份）批量签名——RLS 已保证只返回可读图行，故签名前的可读判定由「取数即受 RLS 约束」承担；草稿图行学生根本取不到。提供 `signCovers()` 给流封面、`signPostImages()` 给详情图组。先写测试。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/lib/queries/assets.ts`
- Test: `C:/Users/david/haoqi-online/src/lib/queries/assets.test.ts`

- [ ] 写失败测试 `src/lib/queries/assets.test.ts`：

```ts
import { describe, it, expect, vi } from "vitest";
import { signCovers, signPostImages } from "./assets";

function mockStorage(map: Record<string, string>) {
  return {
    storage: {
      from: () => ({
        createSignedUrls: vi.fn(async (keys: string[]) =>
          ({ data: keys.map((k) => ({ path: k, signedUrl: map[k] ?? null, error: null })), error: null })),
        createSignedUrl: vi.fn(async (key: string) =>
          ({ data: map[key] ? { signedUrl: map[key] } : null, error: map[key] ? null : { message: "not found" } })),
      }),
    },
  } as never;
}

describe("signCovers", () => {
  it("maps coverKey -> signed url, null when no key", async () => {
    const client = mockStorage({ "posts/p1/a.jpg": "https://s/p1" });
    const out = await signCovers(client, [
      { postId: "p1", coverKey: "posts/p1/a.jpg" },
      { postId: "p2", coverKey: null },
    ]);
    expect(out).toEqual({ p1: "https://s/p1", p2: null });
  });
  it("returns empty map when no keys at all", async () => {
    const client = mockStorage({});
    const out = await signCovers(client, [{ postId: "p2", coverKey: null }]);
    expect(out).toEqual({ p2: null });
  });
});

describe("signPostImages", () => {
  it("signs each asset key in order, caps at 9", async () => {
    const map: Record<string, string> = {};
    const assets = Array.from({ length: 12 }, (_, i) => {
      map[`k${i}`] = `https://s/k${i}`;
      return { storageKey: `k${i}`, sortOrder: i };
    });
    const client = mockStorage(map);
    const out = await signPostImages(client, assets);
    expect(out).toHaveLength(9);
    expect(out[0]).toBe("https://s/k0");
  });
  it("drops assets whose signing fails (no broken img)", async () => {
    const client = mockStorage({ k0: "https://s/k0" });
    const out = await signPostImages(client, [
      { storageKey: "k0", sortOrder: 0 },
      { storageKey: "missing", sortOrder: 1 },
    ]);
    expect(out).toEqual(["https://s/k0"]);
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/queries/assets.test.ts`。

- [ ] 写实现 `src/lib/queries/assets.ts`：

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

const BUCKET = "post-assets";
const TTL_SECONDS = 60 * 10; // 10 分钟短时效
const MAX_IMAGES = 9; // 详情图组软上限（spec §2.2.5）

type Client = SupabaseClient<Database>;

/**
 * 批量为动态流封面签 URL。client 受 RLS 约束 → 草稿图行根本取不到，
 * 故此处传入的 coverKey 都已是当前用户可读图（spec §3.10/§4.4）。
 */
export async function signCovers(
  client: Client,
  items: { postId: string; coverKey: string | null }[],
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  const withKey = items.filter((i) => i.coverKey);
  for (const i of items) result[i.postId] = null;
  if (withKey.length === 0) return result;
  const keys = withKey.map((i) => i.coverKey as string);
  const { data, error } = await client.storage.from(BUCKET).createSignedUrls(keys, TTL_SECONDS);
  if (error) throw new Error(error.message);
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  for (const i of withKey) result[i.postId] = byPath.get(i.coverKey as string) ?? null;
  return result;
}

/** 详情页图组：按 sortOrder 签名，软上限 9 张，签失败的丢弃（不渲染坏图）。 */
export async function signPostImages(
  client: Client,
  assets: { storageKey: string; sortOrder: number }[],
): Promise<string[]> {
  const ordered = assets.slice().sort((a, b) => a.sortOrder - b.sortOrder).slice(0, MAX_IMAGES);
  const urls: string[] = [];
  for (const a of ordered) {
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(a.storageKey, TTL_SECONDS);
    if (error || !data?.signedUrl) continue;
    urls.push(data.signedUrl);
  }
  return urls;
}
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/queries/assets.test.ts`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/lib/queries/assets.ts src/lib/queries/assets.test.ts
git commit -m "feat(course): Storage 签名 URL 工具（封面批量 + 图组按序，9 张上限）

满足 spec §4.4/§3.10 读图，受 RLS 约束草稿图不泄露；含单测

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6：页面 — `/courses` 课程列表（SC 取数 + 装配 + 六态）

实现 spec §2.2.1/§2.2.2：头像栏 + 综合动态流；loading 用 `loading.tsx`，error 用 `error.tsx`，empty/no-permission 在内容里处理。SC 取数（`server.ts` 受 RLS）→ 签封面 → 传 `CourseFeedSection`（CC 客户端筛选）。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/page.tsx`
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/loading.tsx`
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/error.tsx`
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/courses.module.css`

- [ ] 写页面 `src/app/(shell)/courses/page.tsx`（默认 SC）：

```tsx
import { createClient } from "@/lib/supabase/server";
import { getCourseFeed, getCoursesForFilter } from "@/lib/queries/courseFeed";
import { signCovers } from "@/lib/queries/assets";
import { CourseFeedSection } from "@/components/post/CourseFeedSection";
import { StateBlock } from "@/components/ui/StateBlock";
import type { FeedItemWithCover } from "@/components/post/PostFeed";
import styles from "./courses.module.css";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const supabase = await createClient();
  const now = new Date();

  const [feed, courses] = await Promise.all([
    getCourseFeed(supabase, { now }),
    getCoursesForFilter(supabase, { now }),
  ]);

  if (courses.length === 0) {
    return (
      <div className={styles.view}>
        <Header />
        <StateBlock
          variant="empty"
          title="你还没有加入任何课程"
          message="等老师把你加进花名册，这里就会长出课程。"
        />
      </div>
    );
  }

  const coverMap = await signCovers(
    supabase,
    feed.map((f) => ({ postId: f.postId, coverKey: f.coverKey })),
  );
  const items: FeedItemWithCover[] = feed.map((f) => ({ ...f, coverUrl: coverMap[f.postId] ?? null }));

  return (
    <div className={styles.view}>
      <Header />
      <CourseFeedSection items={items} courses={courses} now={now.toISOString()} />
    </div>
  );
}

function Header() {
  return (
    <header className={styles.head}>
      <p className={styles.kicker}>COURSE FEED</p>
      <h1 className={styles.title}>
        每门课，<span>都在长出</span>自己的宇宙。
      </h1>
    </header>
  );
}
```

- [ ] 写 `src/app/(shell)/courses/loading.tsx`（骨架，spec §2.2.2 loading：头像栏 5–6 灰圆 + 流 3–4 骨架）：

```tsx
import styles from "./courses.module.css";

export default function Loading() {
  return (
    <div className={styles.view} aria-busy="true" aria-label="加载中">
      <div className={styles.head}>
        <div className={`${styles.skel} ${styles.skelKicker}`} />
        <div className={`${styles.skel} ${styles.skelTitle}`} />
      </div>
      <div className={styles.skelBar}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${styles.skel} ${styles.skelCircle}`} />
        ))}
      </div>
      <div className={styles.skelFeed}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.skel} ${styles.skelCard}`} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] 写 `src/app/(shell)/courses/error.tsx`（错误就地可重试，CC）：

```tsx
"use client";

import { StateBlock } from "@/components/ui/StateBlock";
import styles from "./courses.module.css";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.view}>
      <StateBlock
        variant="error"
        title="课程没加载出来"
        message="可能是网络抖了一下。"
        actionLabel="点这里重试"
        onRetry={reset}
      />
    </div>
  );
}
```

- [ ] 写样式 `src/app/(shell)/courses/courses.module.css`：

```css
.view {
  max-width: 1420px;
  margin: auto;
  padding: 30px clamp(25px, 4.2vw, 70px);
}
.head {
  margin-bottom: 22px;
}
.kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2.5px;
  color: var(--ink-soft);
}
.title {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 800;
  line-height: 1.2;
  color: var(--ink);
}
.title span {
  color: var(--coral);
}
.skel {
  background: linear-gradient(90deg, var(--line) 25%, #f0eee7 37%, var(--line) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: 10px;
}
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
.skelKicker { width: 120px; height: 12px; margin-bottom: 10px; }
.skelTitle { width: 60%; height: 30px; }
.skelBar { display: flex; gap: 18px; margin: 22px 0; }
.skelCircle { width: 48px; height: 48px; border-radius: 50%; flex: 0 0 auto; }
.skelFeed { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
.skelCard { height: 280px; border-radius: var(--radius); }
@media (max-width: 720px) {
  .view { padding: 20px 16px; }
}
```

- [ ] 验证 build 通过：`cd C:/Users/david/haoqi-online && npm run build`（预期编译过；类型/import 无误）。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add "src/app/(shell)/courses/"
git commit -m "feat(course): /courses 课程列表页（SC 取数装配 + loading/error/empty 六态）

满足 spec §2.2.1/§2.2.2、§6.6 B（头像靠前+筛选）、H（loading/error/empty）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7：数据层 — 课程主页取数（档案头 + 本课内容流 + 草稿区可见性）+ 单元测试

实现 spec §2.2.3/§2.2.4 与 §3.7 草稿收口：`getCourseHome()` 取课程档案头（名/简介/头像/负责人头像组/成员数）；`getCourseHomePosts()` 取本课已发布流；`getCourseDrafts()` 取草稿区（仅当当前用户对本课 `can_post_course` 或 admin 时返回，否则空数组——RLS 已兜底，但应用层也据角色决定是否渲染草稿分区）。先写测试。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/lib/queries/courseHome.ts`
- Test: `C:/Users/david/haoqi-online/src/lib/queries/courseHome.test.ts`

- [ ] 写失败测试 `src/lib/queries/courseHome.test.ts`：

```ts
import { describe, it, expect, vi } from "vitest";
import { getCourseHome, getCourseHomePosts, getCourseDrafts } from "./courseHome";

describe("getCourseHome", () => {
  it("maps profile header fields", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "c1", name: "问题与方法", description: "学着提问", avatar_url: null,
        CourseMembership: [
          { role: "teacher", profiles: { id: "u1", display_name: "Kiki", avatar_url: null } },
          { role: "member", profiles: { id: "u2", display_name: "林元", avatar_url: null } },
        ],
      },
      error: null,
    });
    const client = { from: () => ({ select: () => ({ eq: () => ({ is: () => ({ single }) }) }) }) } as never;
    const home = await getCourseHome(client, "c1");
    expect(home!.name).toBe("问题与方法");
    expect(home!.description).toBe("学着提问");
    expect(home!.leaders.map((l) => l.id)).toEqual(["u1"]); // 只 teacher/assistant 进头像组
    expect(home!.memberCount).toBe(2);
  });
  it("returns null when course not found / not readable", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116", message: "no rows" } });
    const client = { from: () => ({ select: () => ({ eq: () => ({ is: () => ({ single }) }) }) }) } as never;
    expect(await getCourseHome(client, "cX")).toBeNull();
  });
  it("placeholder description when null, no fabrication", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "c1", name: "X", description: null, avatar_url: null, CourseMembership: [] }, error: null });
    const client = { from: () => ({ select: () => ({ eq: () => ({ is: () => ({ single }) }) }) }) } as never;
    const home = await getCourseHome(client, "c1");
    expect(home!.description).toBeNull(); // 由 UI 渲染「这门课还没写简介」，数据层不编造
  });
});

describe("getCourseDrafts", () => {
  it("returns [] for non-privileged viewer (canManage=false)", async () => {
    const client = { from: vi.fn() } as never;
    const drafts = await getCourseDrafts(client, "c1", { canManage: false, now: new Date() });
    expect(drafts).toEqual([]);
    expect((client as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/queries/courseHome.test.ts`。

- [ ] 写实现 `src/lib/queries/courseHome.ts`：

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { getCourseFeed, type FeedItem } from "./courseFeed";

type Client = SupabaseClient<Database>;

export type CourseHome = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  leaders: { id: string; displayName: string; avatarUrl: string | null }[];
  memberCount: number;
};

/** 课程档案头（spec §2.2.3）。RLS 保证不可读课程返回 null。 */
export async function getCourseHome(client: Client, courseId: string): Promise<CourseHome | null> {
  const { data, error } = await client
    .from("Course")
    .select("id, name, description, avatar_url, CourseMembership(role, profiles:user_id(id, display_name, avatar_url))")
    .eq("id", courseId)
    .is("deleted_at", null)
    .single();
  if (error || !data) return null;
  type M = { role: string; profiles: { id: string; display_name: string; avatar_url: string | null } };
  const memberships = ((data as { CourseMembership: M[] }).CourseMembership ?? []);
  const leaders = memberships
    .filter((m) => m.role === "teacher" || m.role === "assistant")
    .map((m) => ({ id: m.profiles.id, displayName: m.profiles.display_name, avatarUrl: m.profiles.avatar_url }));
  return {
    id: data.id as string,
    name: data.name as string,
    description: (data.description as string | null) ?? null,
    avatarUrl: (data.avatar_url as string | null) ?? null,
    leaders,
    memberCount: memberships.length,
  };
}

/** 本课已发布动态流，倒序（复用 getCourseFeed 的 courseId 过滤）。 */
export async function getCourseHomePosts(client: Client, courseId: string, now: Date): Promise<FeedItem[]> {
  return getCourseFeed(client, { now, courseId });
}

/** 草稿区：仅负责人/admin（canManage）可见；否则不查库直接返回 []（spec §2.2.3/§2.2.4 draft）。 */
export async function getCourseDrafts(
  client: Client,
  courseId: string,
  opts: { canManage: boolean; now: Date },
): Promise<FeedItem[]> {
  if (!opts.canManage) return [];
  const { data, error } = await client
    .from("Post")
    .select("id, title, body_markdown, published_at, created_at, space_id, Course:space_id(id, name, short_name, avatar_url), PostAsset(storage_key, sort_order), Comment(count)")
    .eq("space_type", "course")
    .eq("space_id", courseId)
    .eq("status", "draft")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row): FeedItem => {
    const course = (row as { Course: { id: string; name: string; short_name: string | null; avatar_url: string | null } }).Course;
    const assets = ((row as { PostAsset: { storage_key: string; sort_order: number }[] }).PostAsset ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    return {
      postId: row.id as string,
      courseId: course.id,
      courseName: course.name,
      courseShortName: course.short_name,
      courseAvatarUrl: course.avatar_url,
      title: row.title as string,
      excerpt: "",
      publishedAt: (row.created_at as string),
      coverKey: assets[0]?.storage_key ?? null,
      commentCount: ((row as { Comment: { count: number }[] }).Comment?.[0]?.count) ?? 0,
      isFresh: false,
    };
  });
}

/** 当前用户能否管理该课（发帖/看草稿）：admin 或本课 teacher/assistant。 */
export async function canManageCourse(client: Client, courseId: string): Promise<boolean> {
  const { data, error } = await client.rpc("can_post_course", { cid: courseId });
  if (error) return false;
  return data === true;
}
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/queries/courseHome.test.ts`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/lib/queries/courseHome.ts src/lib/queries/courseHome.test.ts
git commit -m "feat(course): 课程主页取数（档案头/本课流/草稿区按权限）

满足 spec §2.2.3/§2.2.4、§3.7 草稿收口、§3.11 不变量 5；含单测

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8：页面 — `/courses/[courseId]` 课程主页（SC + 六态 + 草稿分区 + 发帖 v2 占位）

实现 spec §2.2.3/§2.2.4：档案头 + 本课内容流 + 老师草稿分区（明显 draft 标记）；空态/错误/no-permission（深链不可读课程走 `notFound()`→ no-permission 文案）；「＋ 发布第一条」是诚实占位「发帖功能 v2」（spec §1.5/§6.6 E）。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/page.tsx`
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/loading.tsx`
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/error.tsx`
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/coursehome.module.css`

- [ ] 写页面 `src/app/(shell)/courses/[courseId]/page.tsx`：

```tsx
import { createClient } from "@/lib/supabase/server";
import { getCourseHome, getCourseHomePosts, getCourseDrafts, canManageCourse } from "@/lib/queries/courseHome";
import { signCovers } from "@/lib/queries/assets";
import { PostFeed, type FeedItemWithCover } from "@/components/post/PostFeed";
import { StateBlock } from "@/components/ui/StateBlock";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./coursehome.module.css";

export const dynamic = "force-dynamic";

export default async function CourseHomePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createClient();
  const now = new Date();

  const home = await getCourseHome(supabase, courseId);
  if (!home) {
    return (
      <div className={styles.view}>
        <StateBlock
          variant="no-permission"
          title="这门课的内容暂时不对你开放"
          message="它可能还没公开，或不在你的课程里。"
          actionLabel="返回课程列表"
          href="/courses"
        />
      </div>
    );
  }

  const canManage = await canManageCourse(supabase, courseId);
  const [posts, drafts] = await Promise.all([
    getCourseHomePosts(supabase, courseId, now),
    getCourseDrafts(supabase, courseId, { canManage, now }),
  ]);

  const coverMap = await signCovers(
    supabase,
    [...posts, ...drafts].map((p) => ({ postId: p.postId, coverKey: p.coverKey })),
  );
  const pubItems: FeedItemWithCover[] = posts.map((p) => ({ ...p, coverUrl: coverMap[p.postId] ?? null }));
  const draftItems: FeedItemWithCover[] = drafts.map((p) => ({ ...p, coverUrl: coverMap[p.postId] ?? null }));

  return (
    <div className={styles.view}>
      <header className={styles.profile}>
        <Avatar name={home.name} avatarUrl={home.avatarUrl} size={72} colorKey={home.id} />
        <div className={styles.profileText}>
          <h1 className={styles.name}>{home.name}</h1>
          <p className={styles.desc}>{home.description ?? "这门课还没写简介。"}</p>
          <div className={styles.metaRow}>
            <div className={styles.leaders} aria-label="负责老师">
              {home.leaders.map((l) => (
                <Avatar key={l.id} name={l.displayName} avatarUrl={l.avatarUrl} size={24} colorKey={l.id} />
              ))}
            </div>
            <span className={styles.metaText}>{home.memberCount} 名成员 · 本学期</span>
          </div>
        </div>
        {canManage && (
          <span className={styles.v2Badge} aria-disabled="true" title="发帖功能 v2">
            ＋ 发布第一条 · 发帖功能 v2
          </span>
        )}
      </header>

      {canManage && draftItems.length > 0 && (
        <section className={styles.draftSection} aria-label="草稿">
          <h2 className={styles.sectionTitle}>
            草稿 <span className={styles.draftHint}>· 仅你可见</span>
          </h2>
          <div className={styles.draftWrap}>
            <PostFeed items={draftItems} now={now} />
          </div>
        </section>
      )}

      <section aria-label="课程动态">
        {pubItems.length === 0 ? (
          <StateBlock
            variant="empty"
            title="这门课还没有公开的动态"
            message={canManage ? "等你发布第一条（发帖功能 v2 上线后）。" : "等老师发布第一条动态。"}
          />
        ) : (
          <PostFeed items={pubItems} now={now} />
        )}
      </section>
    </div>
  );
}
```

- [ ] 写 `src/app/(shell)/courses/[courseId]/loading.tsx`：

```tsx
import styles from "./coursehome.module.css";

export default function Loading() {
  return (
    <div className={styles.view} aria-busy="true" aria-label="加载中">
      <div className={styles.profile}>
        <div className={`${styles.skel} ${styles.skelAvatar}`} />
        <div className={styles.profileText}>
          <div className={`${styles.skel} ${styles.skelName}`} />
          <div className={`${styles.skel} ${styles.skelDesc}`} />
        </div>
      </div>
      <div className={styles.skelFeed}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.skel} ${styles.skelCard}`} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] 写 `src/app/(shell)/courses/[courseId]/error.tsx`：

```tsx
"use client";

import { StateBlock } from "@/components/ui/StateBlock";
import styles from "./coursehome.module.css";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.view}>
      <StateBlock variant="error" title="课程主页没加载出来" message="网络抖了一下。" actionLabel="点这里重试" onRetry={reset} />
    </div>
  );
}
```

- [ ] 写样式 `src/app/(shell)/courses/[courseId]/coursehome.module.css`：

```css
.view {
  max-width: 1420px;
  margin: auto;
  padding: 30px clamp(25px, 4.2vw, 70px);
}
.profile {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 22px;
}
.profileText { flex: 1; min-width: 0; }
.name { margin: 0 0 6px; font-size: clamp(22px, 2.6vw, 30px); font-weight: 800; color: var(--ink); }
.desc { margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: var(--ink-soft); }
.metaRow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.leaders { display: flex; }
.leaders > * { margin-left: -6px; }
.leaders > *:first-child { margin-left: 0; }
.metaText { font-size: 12px; color: var(--ink-soft); }
.v2Badge {
  flex: 0 0 auto;
  border: 1px dashed var(--line);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-soft);
  background: var(--white);
  cursor: not-allowed;
}
.draftSection { margin-bottom: 26px; }
.sectionTitle { font-size: 16px; font-weight: 800; color: var(--ink); margin: 0 0 12px; }
.draftHint { color: var(--ink-soft); font-weight: 600; font-size: 13px; }
.draftWrap {
  border: 1px dashed var(--coral);
  border-radius: var(--radius);
  padding: 14px;
  background: rgba(255, 198, 181, 0.08);
}
.skel { background: linear-gradient(90deg, var(--line) 25%, #f0eee7 37%, var(--line) 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-radius: 10px; }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.skelAvatar { width: 72px; height: 72px; border-radius: 50%; flex: 0 0 auto; }
.skelName { width: 40%; height: 26px; margin-bottom: 10px; }
.skelDesc { width: 70%; height: 14px; }
.skelFeed { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
.skelCard { height: 280px; border-radius: var(--radius); }
@media (max-width: 720px) {
  .view { padding: 20px 16px; }
  .profile { flex-wrap: wrap; }
  .v2Badge { width: 100%; }
}
```

- [ ] 验证 build 通过：`cd C:/Users/david/haoqi-online && npm run build`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add "src/app/(shell)/courses/[courseId]/page.tsx" "src/app/(shell)/courses/[courseId]/loading.tsx" "src/app/(shell)/courses/[courseId]/error.tsx" "src/app/(shell)/courses/[courseId]/coursehome.module.css"
git commit -m "feat(course): /courses/[courseId] 课程主页（档案头/流/草稿分区/发帖 v2 占位/六态）

满足 spec §2.2.3/§2.2.4、§6.6 B/E/H（no-permission 文案 + 草稿仅负责人可见 + 诚实占位）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9：组件 — Markdown 渲染器 + 图片组横滑（ImageCarousel）+ 组件测试

实现 spec §2.2.5：Markdown 正文（渲染标题/列表/引用/行内强调/行内链接为文本，PDF/表格/外链按纯链接文本，正文不内联图）；图片组 `PostAsset(image)` 横滑、页码点、键盘左右、每张 alt、0/1 张不渲染指示点。Markdown 用 `react-markdown`（前面阶段已装；本阶段若未装则 `npm i react-markdown`）。先写组件测试。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/components/post/Markdown.tsx`
- Create: `C:/Users/david/haoqi-online/src/components/post/ImageCarousel.tsx`
- Create: `C:/Users/david/haoqi-online/src/components/post/ImageCarousel.module.css`
- Create: `C:/Users/david/haoqi-online/src/components/post/Markdown.module.css`
- Test: `C:/Users/david/haoqi-online/src/components/post/ImageCarousel.test.tsx`
- Test: `C:/Users/david/haoqi-online/src/components/post/Markdown.test.tsx`

- [ ] 确保依赖在位（幂等，已装则跳过）：`cd C:/Users/david/haoqi-online && npm ls react-markdown || npm i react-markdown@9`。

- [ ] 写失败测试 `src/components/post/Markdown.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("renders headings and paragraphs", () => {
    render(<Markdown body={"# 标题\n\n一段正文"} />);
    expect(screen.getByRole("heading", { name: "标题" })).toBeInTheDocument();
    expect(screen.getByText("一段正文")).toBeInTheDocument();
  });
  it("renders inline link as anchor", () => {
    render(<Markdown body={"看 [文档](https://example.com)"} />);
    expect(screen.getByRole("link", { name: "文档" })).toHaveAttribute("href", "https://example.com");
  });
  it("does NOT render image markup as <img> (正文不内联图)", () => {
    const { container } = render(<Markdown body={"![alt](https://x/y.jpg)"} />);
    expect(container.querySelector("img")).toBeNull();
  });
  it("renders empty placeholder when body is null", () => {
    render(<Markdown body={null} />);
    expect(screen.getByText("这条动态还没有正文。")).toBeInTheDocument();
  });
});
```

- [ ] 写失败测试 `src/components/post/ImageCarousel.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageCarousel } from "./ImageCarousel";

describe("ImageCarousel", () => {
  it("renders nothing for empty list", () => {
    const { container } = render(<ImageCarousel urls={[]} title="标题" />);
    expect(container.firstChild).toBeNull();
  });
  it("single image: no dots", () => {
    render(<ImageCarousel urls={["u1"]} title="标题" />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("alt", "标题 图 1");
  });
  it("multi image: renders dots and switches on next button", () => {
    render(<ImageCarousel urls={["u1", "u2", "u3"]} title="标题" />);
    const dots = screen.getAllByRole("tab");
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByLabelText("下一张"));
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-selected", "true");
  });
  it("keyboard ArrowRight advances", () => {
    render(<ImageCarousel urls={["u1", "u2"]} title="标题" />);
    fireEvent.keyDown(screen.getByRole("group"), { key: "ArrowRight" });
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-selected", "true");
  });
});
```

- [ ] 跑测试看它们失败：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/Markdown.test.tsx src/components/post/ImageCarousel.test.tsx`。

- [ ] 写实现 `src/components/post/Markdown.tsx`（禁用 `img`，外链按文本/锚点）：

```tsx
import ReactMarkdown from "react-markdown";
import styles from "./Markdown.module.css";

/** 正文 Markdown 渲染（spec §2.2.5）：渲染标题/列表/引用/强调/行内链接；不渲染内联图。 */
export function Markdown({ body }: { body: string | null }) {
  if (!body || body.trim() === "") {
    return <p className={styles.empty}>这条动态还没有正文。</p>;
  }
  return (
    <div className={styles.prose}>
      <ReactMarkdown
        components={{
          img: () => null, // 正文不内联图，图走 PostAsset 图组
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] 写实现 `src/components/post/ImageCarousel.tsx`（CC，横滑 + 页码点 + 键盘）：

```tsx
"use client";

import { useState } from "react";
import styles from "./ImageCarousel.module.css";

/** PostAsset 图片组横滑（spec §2.2.5）：0 张不渲染，1 张无点，多图带点 + 键盘左右。 */
export function ImageCarousel({ urls, title }: { urls: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  if (urls.length === 0) return null;
  const multi = urls.length > 1;
  const go = (next: number) => setIndex((next + urls.length) % urls.length);

  return (
    <div
      className={styles.carousel}
      role="group"
      aria-roledescription="图片组"
      aria-label={`${title} 图片，共 ${urls.length} 张`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (!multi) return;
        if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      }}
    >
      <div className={styles.frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.image} src={urls[index]} alt={`${title} 图 ${index + 1}`} />
        {multi && (
          <>
            <button type="button" className={`${styles.nav} ${styles.prev}`} aria-label="上一张" onClick={() => go(index - 1)}>‹</button>
            <button type="button" className={`${styles.nav} ${styles.next}`} aria-label="下一张" onClick={() => go(index + 1)}>›</button>
          </>
        )}
      </div>
      {multi && (
        <div className={styles.dots} role="tablist" aria-label="图片页码">
          {urls.map((_, i) => (
            <button
              key={i}
              role="tab"
              type="button"
              aria-selected={i === index}
              aria-label={`第 ${i + 1} 张`}
              className={styles.dot}
              data-active={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] 写样式 `src/components/post/ImageCarousel.module.css`：

```css
.carousel { margin: 0 0 18px; }
.carousel:focus-visible { outline: 2px solid var(--navy); outline-offset: 4px; border-radius: var(--radius); }
.frame {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}
.image { width: 100%; height: 100%; object-fit: contain; display: block; background: var(--white); }
.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(24, 36, 59, 0.55);
  color: var(--white);
  font-size: 24px;
  line-height: 1;
  display: grid;
  place-items: center;
}
.prev { left: 10px; }
.next { right: 10px; }
.dots { display: flex; gap: 7px; justify-content: center; margin-top: 10px; }
.dot { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 50%; background: var(--line); }
.dot[data-active="true"] { background: var(--navy); }
.dot:focus-visible { outline: 2px solid var(--navy); outline-offset: 2px; }
```

- [ ] 写样式 `src/components/post/Markdown.module.css`：

```css
.prose { font-size: 15px; line-height: 1.75; color: var(--ink); }
.prose h1 { font-size: 22px; font-weight: 800; margin: 1.2em 0 0.5em; }
.prose h2 { font-size: 19px; font-weight: 800; margin: 1.1em 0 0.5em; }
.prose h3 { font-size: 16px; font-weight: 700; margin: 1em 0 0.4em; }
.prose p { margin: 0 0 1em; }
.prose ul, .prose ol { margin: 0 0 1em; padding-left: 1.4em; }
.prose li { margin: 0.2em 0; }
.prose blockquote {
  margin: 0 0 1em;
  padding: 4px 14px;
  border-left: 3px solid var(--coral);
  color: var(--ink-soft);
  background: rgba(255, 198, 181, 0.1);
  border-radius: 0 8px 8px 0;
}
.prose a { color: var(--navy); text-decoration: underline; text-underline-offset: 2px; }
.prose code { background: var(--lemon); padding: 1px 5px; border-radius: 5px; font-size: 0.9em; }
.empty { font-size: 14px; color: var(--ink-soft); font-style: italic; }
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/Markdown.test.tsx src/components/post/ImageCarousel.test.tsx`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/components/post/Markdown.tsx src/components/post/Markdown.module.css src/components/post/ImageCarousel.tsx src/components/post/ImageCarousel.module.css src/components/post/Markdown.test.tsx src/components/post/ImageCarousel.test.tsx
git commit -m "feat(course): Markdown 正文渲染器（禁内联图）+ ImageCarousel 图组横滑

满足 spec §2.2.5 正文/图组规则；含组件测试

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10：Server Action — 评论发表（权限校验 + session 过期识别）+ 单元测试

实现 spec §2.2.6/§3.9：评论提交走 Server Action，服务端用 `server.ts` 写库（RLS 兜底「看得见才可评」），返回判别式结果 `ok | unauthenticated | error`，供前端区分 session 过期（暂存）与普通失败。`author_id` 由 `auth.uid()` 走 RLS `with check` 写入，不信客户端。先写测试。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/posts/[postId]/actions.ts`
- Test: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/posts/[postId]/actions.test.ts`

- [ ] 写失败测试 `actions.test.ts`（mock `server.ts` 的 `createClient` 与 `revalidatePath`）：

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockInsert = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ insert: mockInsert }),
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { submitComment } from "./actions";

beforeEach(() => {
  mockGetUser.mockReset();
  mockInsert.mockReset();
});

describe("submitComment", () => {
  it("returns ok with inserted comment on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockInsert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "c1", author_id: "u1", body: "好", created_at: "2026-06-21T12:00:00Z" }, error: null }) }) });
    const res = await submitComment({ postId: "p1", courseId: "x", body: "好" });
    expect(res.status).toBe("ok");
    if (res.status === "ok") expect(res.comment.id).toBe("c1");
  });
  it("returns unauthenticated when no user (session expired)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await submitComment({ postId: "p1", courseId: "x", body: "好" });
    expect(res.status).toBe("unauthenticated");
  });
  it("returns error with empty body rejected before insert", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const res = await submitComment({ postId: "p1", courseId: "x", body: "   " });
    expect(res.status).toBe("error");
    expect(mockInsert).not.toHaveBeenCalled();
  });
  it("maps RLS denial (insert error) to unauthenticated when 401-like, else error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockInsert.mockReturnValue({ select: () => ({ single: async () => ({ data: null, error: { code: "42501", message: "permission denied" } }) }) });
    const res = await submitComment({ postId: "p1", courseId: "x", body: "好" });
    expect(res.status).toBe("error");
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- "src/app/(shell)/courses/[courseId]/posts/[postId]/actions.test.ts"`。

- [ ] 写实现 `actions.ts`：

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitCommentInput = { postId: string; courseId: string; body: string };

export type CommentRow = { id: string; author_id: string; body: string; created_at: string };

export type SubmitCommentResult =
  | { status: "ok"; comment: CommentRow }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

/** 评论发表（spec §2.2.6/§3.9）：服务端校验 + RLS 写库；区分 session 过期与普通失败。 */
export async function submitComment(input: SubmitCommentInput): Promise<SubmitCommentResult> {
  const body = input.body.trim();
  if (body.length === 0) return { status: "error", message: "评论不能为空" };
  if (body.length > 2000) return { status: "error", message: "评论太长了，精简一下" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { status: "unauthenticated" };

  const { data, error } = await supabase
    .from("Comment")
    .insert({ post_id: input.postId, author_id: userData.user.id, body })
    .select("id, author_id, body, created_at")
    .single();

  if (error || !data) {
    return { status: "error", message: "没发出去，重试" };
  }

  revalidatePath(`/courses/${input.courseId}/posts/${input.postId}`);
  return { status: "ok", comment: data as CommentRow };
}
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- "src/app/(shell)/courses/[courseId]/posts/[postId]/actions.test.ts"`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add "src/app/(shell)/courses/[courseId]/posts/[postId]/actions.ts" "src/app/(shell)/courses/[courseId]/posts/[postId]/actions.test.ts"
git commit -m "feat(course): 评论发表 Server Action（服务端权限 + session 过期判别）

满足 spec §2.2.6/§3.9、§3.11 不变量 4/6；含单测

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11：组件 — CommentBox（评论输入框三态 + 防双提交 + 过期暂存）+ 组件测试

实现 spec §2.2.6：发送按钮 in-flight `disabled+loading`（`useTransition`）防并发；成功本地追加 + 清空；失败保留输入 + 红字「没发出去，重试」；`unauthenticated` → 暂存 localStorage + 提示「登录状态过期了，重新登录后你的评论会保留」。先写组件测试。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/components/post/CommentBox.tsx`
- Create: `C:/Users/david/haoqi-online/src/components/post/CommentList.tsx`
- Create: `C:/Users/david/haoqi-online/src/components/post/Comments.module.css`
- Test: `C:/Users/david/haoqi-online/src/components/post/CommentBox.test.tsx`

- [ ] 写失败测试 `src/components/post/CommentBox.test.tsx`（注入假 action）：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommentBox } from "./CommentBox";

const base = { postId: "p1", courseId: "c1", currentUser: { id: "u1", displayName: "我", avatarUrl: null } };

describe("CommentBox", () => {
  it("send disabled when input empty", () => {
    render(<CommentBox {...base} action={vi.fn()} onAdded={vi.fn()} />);
    expect(screen.getByRole("button", { name: "发送" })).toBeDisabled();
  });
  it("on success: clears input and calls onAdded", async () => {
    const action = vi.fn().mockResolvedValue({ status: "ok", comment: { id: "c9", author_id: "u1", body: "好", created_at: "2026-06-21T12:00:00Z" } });
    const onAdded = vi.fn();
    render(<CommentBox {...base} action={action} onAdded={onAdded} />);
    fireEvent.change(screen.getByPlaceholderText("写评论…"), { target: { value: "好" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect((screen.getByPlaceholderText("写评论…") as HTMLTextAreaElement).value).toBe("");
  });
  it("on error: keeps input and shows retry message", async () => {
    const action = vi.fn().mockResolvedValue({ status: "error", message: "没发出去，重试" });
    render(<CommentBox {...base} action={action} onAdded={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("写评论…"), { target: { value: "好" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(screen.getByText("没发出去，重试")).toBeInTheDocument());
    expect((screen.getByPlaceholderText("写评论…") as HTMLTextAreaElement).value).toBe("好");
  });
  it("on unauthenticated: stashes to localStorage and shows expiry notice", async () => {
    const action = vi.fn().mockResolvedValue({ status: "unauthenticated" });
    render(<CommentBox {...base} action={action} onAdded={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("写评论…"), { target: { value: "待发" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(screen.getByText(/登录状态过期了/)).toBeInTheDocument());
    expect(localStorage.getItem("haoqi:comment-draft:p1")).toBe("待发");
  });
  it("prevents double submit while in-flight", async () => {
    let resolve!: (v: unknown) => void;
    const action = vi.fn(() => new Promise((r) => { resolve = r; }));
    render(<CommentBox {...base} action={action} onAdded={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("写评论…"), { target: { value: "好" } });
    const btn = screen.getByRole("button", { name: /发送|发送中/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(action).toHaveBeenCalledTimes(1);
    resolve({ status: "ok", comment: { id: "c1", author_id: "u1", body: "好", created_at: "x" } });
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/CommentBox.test.tsx`。

- [ ] 写实现 `src/components/post/CommentBox.tsx`：

```tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import type { SubmitCommentResult, CommentRow } from "@/app/(shell)/courses/[courseId]/posts/[postId]/actions";
import styles from "./Comments.module.css";

type Props = {
  postId: string;
  courseId: string;
  currentUser: { id: string; displayName: string; avatarUrl: string | null };
  action: (input: { postId: string; courseId: string; body: string }) => Promise<SubmitCommentResult>;
  onAdded: (c: CommentRow & { displayName: string; avatarUrl: string | null }) => void;
};

const draftKey = (postId: string) => `haoqi:comment-draft:${postId}`;

export function CommentBox({ postId, courseId, currentUser, action, onAdded }: Props) {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "error" | "expired"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // 复原上次因 session 过期暂存的草稿
  useEffect(() => {
    try {
      const stashed = localStorage.getItem(draftKey(postId));
      if (stashed) setValue(stashed);
    } catch { /* localStorage 不可用则忽略 */ }
  }, [postId]);

  function send() {
    const body = value.trim();
    if (body.length === 0 || pending) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await action({ postId, courseId, body });
      if (res.status === "ok") {
        onAdded({ ...res.comment, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl });
        setValue("");
        try { localStorage.removeItem(draftKey(postId)); } catch { /* noop */ }
      } else if (res.status === "unauthenticated") {
        try { localStorage.setItem(draftKey(postId), body); } catch { /* noop */ }
        setFeedback({ kind: "expired", text: "登录状态过期了，重新登录后你的评论会保留。" });
      } else {
        setFeedback({ kind: "error", text: res.message });
      }
    });
  }

  return (
    <div className={styles.box}>
      <textarea
        className={styles.input}
        placeholder="写评论…"
        value={value}
        rows={2}
        onChange={(e) => setValue(e.target.value)}
        aria-label="写评论"
      />
      <div className={styles.row}>
        {feedback && (
          <span className={feedback.kind === "expired" ? styles.expired : styles.error} role="alert">
            {feedback.text}
          </span>
        )}
        <button
          type="button"
          className={styles.send}
          disabled={value.trim().length === 0 || pending}
          aria-busy={pending}
          onClick={send}
        >
          {pending ? "发送中…" : "发送"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] 写 `src/components/post/CommentList.tsx`（评论列表，作者头像 + 名 + 相对时间 + 正文；空态文案）：

```tsx
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime } from "@/lib/format/text";
import styles from "./Comments.module.css";

export type CommentView = {
  id: string;
  authorId: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
};

export function CommentList({ comments, now }: { comments: CommentView[]; now: Date }) {
  if (comments.length === 0) {
    return <p className={styles.empty}>还没有人评论，来说第一句。</p>;
  }
  return (
    <ul className={styles.list}>
      {comments.map((c) => (
        <li key={c.id} className={styles.comment}>
          <Avatar name={c.displayName} avatarUrl={c.avatarUrl} size={30} colorKey={c.authorId} />
          <div className={styles.commentBody}>
            <div className={styles.commentHead}>
              <span className={styles.author}>{c.displayName}</span>
              <span className={styles.commentTime}>{relativeTime(c.createdAt, now)}</span>
            </div>
            <p className={styles.commentText}>{c.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] 写样式 `src/components/post/Comments.module.css`：

```css
.box { margin-top: 14px; }
.input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 11px 13px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  background: var(--white);
  color: var(--ink);
}
.input:focus-visible { outline: 2px solid var(--navy); outline-offset: 1px; }
.row { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 8px; }
.error { color: #c0392b; font-size: 13px; margin-right: auto; }
.expired { color: var(--navy); font-size: 13px; margin-right: auto; font-weight: 600; }
.send {
  border: 0;
  padding: 9px 18px;
  border-radius: 10px;
  background: var(--ink);
  color: var(--white);
  font-size: 13px;
  font-weight: 700;
}
.send:disabled { opacity: 0.5; cursor: not-allowed; }
.list { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.comment { display: flex; gap: 11px; }
.commentBody { flex: 1; min-width: 0; }
.commentHead { display: flex; align-items: baseline; gap: 8px; }
.author { font-weight: 700; font-size: 13px; color: var(--ink); }
.commentTime { font-size: 12px; color: var(--ink-soft); }
.commentText { margin: 3px 0 0; font-size: 14px; line-height: 1.55; color: var(--ink); white-space: pre-wrap; word-break: break-word; }
.empty { font-size: 14px; color: var(--ink-soft); }
.disabledNote { font-size: 13px; color: var(--ink-soft); font-style: italic; padding: 10px 0; }
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/CommentBox.test.tsx`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/components/post/CommentBox.tsx src/components/post/CommentList.tsx src/components/post/Comments.module.css src/components/post/CommentBox.test.tsx
git commit -m "feat(course): CommentBox 三态/防双提交/过期暂存 + CommentList

满足 spec §2.2.6；含组件测试（成功/失败/过期/防并发）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12：组件 — CommentSection（乐观追加壳，串联 List + Box）+ 组件测试

实现 spec §2.2.6 乐观更新：CC 持评论列表 state，`onAdded` 本地追加（后台 revalidate 校正）；草稿态评论区禁用并说明「发布后可评论」。把 server 取好的初始评论 + 当前用户 + action 传入。先写组件测试。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/components/post/CommentSection.tsx`
- Test: `C:/Users/david/haoqi-online/src/components/post/CommentSection.test.tsx`

- [ ] 写失败测试 `src/components/post/CommentSection.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommentSection } from "./CommentSection";
import type { CommentView } from "./CommentList";

const user = { id: "u1", displayName: "我", avatarUrl: null };
const initial: CommentView[] = [
  { id: "c1", authorId: "u2", displayName: "林元", avatarUrl: null, body: "先来一条", createdAt: "2026-06-21T10:00:00+08:00" },
];

describe("CommentSection", () => {
  it("renders comment count and initial comments", () => {
    render(<CommentSection postId="p1" courseId="c1" currentUser={user} initialComments={initial} isDraft={false} now={new Date().toISOString()} action={vi.fn()} />);
    expect(screen.getByText("💬 评论 1")).toBeInTheDocument();
    expect(screen.getByText("先来一条")).toBeInTheDocument();
  });
  it("optimistically appends on successful submit and bumps count", async () => {
    const action = vi.fn().mockResolvedValue({ status: "ok", comment: { id: "c2", author_id: "u1", body: "我也说一句", created_at: "2026-06-21T12:00:00+08:00" } });
    render(<CommentSection postId="p1" courseId="c1" currentUser={user} initialComments={initial} isDraft={false} now={new Date("2026-06-21T12:30:00+08:00").toISOString()} action={action} />);
    fireEvent.change(screen.getByPlaceholderText("写评论…"), { target: { value: "我也说一句" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(screen.getByText("我也说一句")).toBeInTheDocument());
    expect(screen.getByText("💬 评论 2")).toBeInTheDocument();
  });
  it("draft post: disables comment box with explanation, no input", () => {
    render(<CommentSection postId="p1" courseId="c1" currentUser={user} initialComments={[]} isDraft now={new Date().toISOString()} action={vi.fn()} />);
    expect(screen.getByText("发布后可评论")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("写评论…")).not.toBeInTheDocument();
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/CommentSection.test.tsx`。

- [ ] 写实现 `src/components/post/CommentSection.tsx`：

```tsx
"use client";

import { useState, useMemo } from "react";
import { CommentList, type CommentView } from "./CommentList";
import { CommentBox } from "./CommentBox";
import type { SubmitCommentResult } from "@/app/(shell)/courses/[courseId]/posts/[postId]/actions";
import styles from "./Comments.module.css";

type Props = {
  postId: string;
  courseId: string;
  currentUser: { id: string; displayName: string; avatarUrl: string | null };
  initialComments: CommentView[];
  isDraft: boolean;
  now: string;
  action: (input: { postId: string; courseId: string; body: string }) => Promise<SubmitCommentResult>;
};

export function CommentSection({ postId, courseId, currentUser, initialComments, isDraft, now, action }: Props) {
  const [comments, setComments] = useState<CommentView[]>(initialComments);
  const nowDate = useMemo(() => new Date(now), [now]);

  return (
    <section className={styles.section} aria-label="评论区">
      <h2 className={styles.heading}>💬 评论 {comments.length}</h2>
      <CommentList comments={comments} now={nowDate} />
      {isDraft ? (
        <p className={styles.disabledNote}>草稿尚未发布，发布后可评论。</p>
      ) : (
        <CommentBox
          postId={postId}
          courseId={courseId}
          currentUser={currentUser}
          action={action}
          onAdded={(c) =>
            setComments((prev) => [
              ...prev,
              { id: c.id, authorId: c.author_id, displayName: c.displayName, avatarUrl: c.avatarUrl, body: c.body, createdAt: c.created_at },
            ])
          }
        />
      )}
    </section>
  );
}
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/components/post/CommentSection.test.tsx`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/components/post/CommentSection.tsx src/components/post/CommentSection.test.tsx
git commit -m "feat(course): CommentSection 乐观追加壳（草稿态禁用评论）

满足 spec §2.2.6 乐观更新 + draft 评论禁用；含组件测试

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13：数据层 — 动态详情取数（Post + 作者 + 评论 + 是否可管理）+ 单元测试

实现 spec §2.2.5 详情页所需数据：`getPostDetail()` 取 Post（标题/正文/状态/课程归属/发布者头像）+ 评论列表（作者头像/名）；判定 `isDraft`、当前用户是否 `canManage`（决定草稿预览态）。RLS 兜底不可读 → null。先写测试。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/lib/queries/postDetail.ts`
- Test: `C:/Users/david/haoqi-online/src/lib/queries/postDetail.test.ts`

- [ ] 写失败测试 `src/lib/queries/postDetail.test.ts`：

```ts
import { describe, it, expect, vi } from "vitest";
import { mapPostDetail } from "./postDetail";

describe("mapPostDetail", () => {
  it("maps post + course + author + comments + assets", () => {
    const row = {
      id: "p1", title: "城市漫游", body_markdown: "# H\n正文", status: "published", published_at: "2026-06-21T06:00:00+08:00", space_id: "c1",
      Course: { id: "c1", name: "城市漫游", avatar_url: null },
      author: { id: "a1", display_name: "Kiki", avatar_url: null },
      PostAsset: [{ storage_key: "k2", sort_order: 1 }, { storage_key: "k1", sort_order: 0 }],
      Comment: [
        { id: "cm1", author_id: "u2", body: "好", created_at: "2026-06-21T10:00:00+08:00", deleted_at: null, author: { display_name: "林元", avatar_url: null } },
      ],
    };
    const d = mapPostDetail(row as never);
    expect(d.title).toBe("城市漫游");
    expect(d.isDraft).toBe(false);
    expect(d.courseName).toBe("城市漫游");
    expect(d.author.avatarUrl).toBeNull();
    expect(d.assets.map((a) => a.storageKey)).toEqual(["k1", "k2"]); // 按 sort_order
    expect(d.comments[0].displayName).toBe("林元");
  });
  it("flags draft when status=draft", () => {
    const row = { id: "p1", title: "x", body_markdown: null, status: "draft", published_at: null, space_id: "c1", Course: { id: "c1", name: "X", avatar_url: null }, author: { id: "a1", display_name: "K", avatar_url: null }, PostAsset: [], Comment: [] };
    expect(mapPostDetail(row as never).isDraft).toBe(true);
  });
});
```

- [ ] 跑测试看它失败：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/queries/postDetail.test.ts`。

- [ ] 写实现 `src/lib/queries/postDetail.ts`：

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { CommentView } from "@/components/post/CommentList";

type Client = SupabaseClient<Database>;

export type PostDetail = {
  postId: string;
  courseId: string;
  courseName: string;
  courseAvatarUrl: string | null;
  title: string;
  bodyMarkdown: string | null;
  isDraft: boolean;
  publishedAt: string | null;
  author: { id: string; avatarUrl: string | null };
  assets: { storageKey: string; sortOrder: number }[];
  comments: CommentView[];
};

type RawRow = {
  id: string; title: string; body_markdown: string | null; status: string; published_at: string | null; space_id: string;
  Course: { id: string; name: string; avatar_url: string | null };
  author: { id: string; display_name: string; avatar_url: string | null };
  PostAsset: { storage_key: string; sort_order: number }[];
  Comment: { id: string; author_id: string; body: string; created_at: string; deleted_at: string | null; author: { display_name: string; avatar_url: string | null } }[];
};

/** 纯映射（便于单测）。 */
export function mapPostDetail(row: RawRow): PostDetail {
  const assets = (row.PostAsset ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => ({ storageKey: a.storage_key, sortOrder: a.sort_order }));
  const comments: CommentView[] = (row.Comment ?? [])
    .filter((c) => c.deleted_at === null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((c) => ({ id: c.id, authorId: c.author_id, displayName: c.author.display_name, avatarUrl: c.author.avatar_url, body: c.body, createdAt: c.created_at }));
  return {
    postId: row.id,
    courseId: row.Course.id,
    courseName: row.Course.name,
    courseAvatarUrl: row.Course.avatar_url,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    isDraft: row.status === "draft",
    publishedAt: row.published_at,
    author: { id: row.author.id, avatarUrl: row.author.avatar_url },
    assets,
    comments,
  };
}

/** 取详情；RLS 兜底不可读返回 null（spec §2.2.5/§2.2.6 no-permission）。 */
export async function getPostDetail(client: Client, courseId: string, postId: string): Promise<PostDetail | null> {
  const { data, error } = await client
    .from("Post")
    .select(
      "id, title, body_markdown, status, published_at, space_id, Course:space_id(id, name, avatar_url), author:author_id(id, display_name, avatar_url), PostAsset(storage_key, sort_order), Comment(id, author_id, body, created_at, deleted_at, author:author_id(display_name, avatar_url))",
    )
    .eq("id", postId)
    .eq("space_id", courseId)
    .is("deleted_at", null)
    .single();
  if (error || !data) return null;
  return mapPostDetail(data as unknown as RawRow);
}
```

- [ ] 跑测试看通过：`cd C:/Users/david/haoqi-online && npm run test -- src/lib/queries/postDetail.test.ts`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add src/lib/queries/postDetail.ts src/lib/queries/postDetail.test.ts
git commit -m "feat(course): 动态详情取数（Post/课程归属/作者头像/图组按序/评论）

满足 spec §2.2.5；RLS 兜底不可读→null；含单测

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14：页面 — `/courses/[courseId]/posts/[postId]` 动态详情（SC 装配 + 六态 + 草稿预览）

实现 spec §2.2.5/§2.2.6：顶栏=课程头像+名称（点回主页）+ 发布者仅头像；图组签名 URL 横滑；Markdown 正文；独立评论区（接 Task 12 的 `CommentSection` + Task 10 的 action）；草稿通栏标签 + 评论禁用；no-permission/error/loading 全态。

**Files:**
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/posts/[postId]/page.tsx`
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/posts/[postId]/loading.tsx`
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/posts/[postId]/error.tsx`
- Create: `C:/Users/david/haoqi-online/src/app/(shell)/courses/[courseId]/posts/[postId]/detail.module.css`

- [ ] 写页面 `page.tsx`：

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/postDetail";
import { signPostImages } from "@/lib/queries/assets";
import { Markdown } from "@/components/post/Markdown";
import { ImageCarousel } from "@/components/post/ImageCarousel";
import { CommentSection } from "@/components/post/CommentSection";
import { StateBlock } from "@/components/ui/StateBlock";
import { Avatar } from "@/components/ui/Avatar";
import { submitComment } from "./actions";
import styles from "./detail.module.css";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }: { params: Promise<{ courseId: string; postId: string }> }) {
  const { courseId, postId } = await params;
  const supabase = await createClient();
  const now = new Date();

  const detail = await getPostDetail(supabase, courseId, postId);
  if (!detail) {
    return (
      <div className={styles.view}>
        <StateBlock
          variant="no-permission"
          title="这条内容暂时不对你开放"
          message="它可能还没公开，或不在你的课程里。"
          actionLabel="返回课程主页"
          href={`/courses/${courseId}`}
        />
      </div>
    );
  }

  const me = await getCurrentUser();
  const imageUrls = await signPostImages(supabase, detail.assets);

  // 当前用户展示信息（评论乐观追加用本人头像/名）
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", me!.id)
    .single();
  const currentUser = {
    id: me!.id,
    displayName: profile?.display_name ?? "我",
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <article className={styles.view}>
      <header className={styles.topbar}>
        <Link href={`/courses/${courseId}`} className={styles.back} aria-label="返回课程主页">←</Link>
        <Link href={`/courses/${courseId}`} className={styles.ownership} aria-label={`课程 ${detail.courseName}`}>
          <Avatar name={detail.courseName} avatarUrl={detail.courseAvatarUrl} size={32} colorKey={detail.courseId} />
          <span className={styles.courseName}>{detail.courseName}</span>
        </Link>
        <div className={styles.publisher}>
          {/* 发布者只放头像、不放名字（spec §2.2.5 铁律） */}
          <Avatar name="作者" avatarUrl={detail.author.avatarUrl} size={28} colorKey={detail.author.id} />
        </div>
      </header>

      {detail.isDraft && (
        <div className={styles.draftBar} role="status">草稿 · 仅你可见 · 尚未发布</div>
      )}

      <ImageCarousel urls={imageUrls} title={detail.title} />

      <h1 className={styles.title}>{detail.title}</h1>
      <Markdown body={detail.bodyMarkdown} />

      <hr className={styles.divider} />

      <CommentSection
        postId={postId}
        courseId={courseId}
        currentUser={currentUser}
        initialComments={detail.comments}
        isDraft={detail.isDraft}
        now={now.toISOString()}
        action={submitComment}
      />
    </article>
  );
}
```

- [ ] 写 `loading.tsx`（顶栏归属占位 + 图/正文/评论骨架，spec §2.2.6 loading）：

```tsx
import styles from "./detail.module.css";

export default function Loading() {
  return (
    <div className={styles.view} aria-busy="true" aria-label="加载中">
      <div className={styles.topbar}>
        <div className={`${styles.skel} ${styles.skelDot}`} />
        <div className={`${styles.skel} ${styles.skelName}`} />
      </div>
      <div className={`${styles.skel} ${styles.skelImg}`} />
      <div className={`${styles.skel} ${styles.skelTitle}`} />
      <div className={`${styles.skel} ${styles.skelLine}`} />
      <div className={`${styles.skel} ${styles.skelLine}`} />
    </div>
  );
}
```

- [ ] 写 `error.tsx`：

```tsx
"use client";

import { StateBlock } from "@/components/ui/StateBlock";
import styles from "./detail.module.css";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.view}>
      <StateBlock variant="error" title="这条动态没加载出来" message="网络抖了一下。" actionLabel="点这里重试" onRetry={reset} />
    </div>
  );
}
```

- [ ] 写样式 `detail.module.css`：

```css
.view {
  max-width: 760px;
  margin: auto;
  padding: 24px clamp(18px, 4vw, 40px) 60px;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 20px;
}
.back {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  text-decoration: none;
  color: var(--ink);
  font-size: 20px;
}
.back:hover { background: var(--line); }
.ownership { display: flex; align-items: center; gap: 9px; text-decoration: none; color: inherit; }
.courseName { font-weight: 800; font-size: 16px; color: var(--ink); }
.publisher { margin-left: auto; }
.draftBar {
  background: var(--coral);
  color: var(--navy);
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
}
.title { margin: 4px 0 14px; font-size: clamp(22px, 3vw, 28px); font-weight: 800; line-height: 1.3; color: var(--ink); }
.divider { border: 0; border-top: 1px solid var(--line); margin: 28px 0 4px; }
.skel { background: linear-gradient(90deg, var(--line) 25%, #f0eee7 37%, var(--line) 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.skelDot { width: 32px; height: 32px; border-radius: 50%; }
.skelName { width: 140px; height: 18px; }
.skelImg { width: 100%; aspect-ratio: 4 / 3; border-radius: var(--radius); margin-bottom: 18px; }
.skelTitle { width: 60%; height: 26px; margin-bottom: 14px; }
.skelLine { width: 100%; height: 14px; margin-bottom: 10px; }
@media (max-width: 720px) {
  .view { padding: 18px 16px 50px; }
}
```

- [ ] 验证 build 通过：`cd C:/Users/david/haoqi-online && npm run build`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add "src/app/(shell)/courses/[courseId]/posts/[postId]/page.tsx" "src/app/(shell)/courses/[courseId]/posts/[postId]/loading.tsx" "src/app/(shell)/courses/[courseId]/posts/[postId]/error.tsx" "src/app/(shell)/courses/[courseId]/posts/[postId]/detail.module.css"
git commit -m "feat(course): /courses/[courseId]/posts/[postId] 动态详情页（顶栏归属/图组/Markdown/评论区/草稿预览/六态）

满足 spec §2.2.5/§2.2.6、§6.6 B/C/H

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 15：e2e — 课程空间端到端（Playwright，覆盖 §6.6 B/C/E/G/H）

实现 spec §6.6 验收的 Playwright e2e：用种子 student/teacher 账号端到端跑列表→主页→详情→评论，覆盖 B（三级页可见已发布、草稿学生看不到）、C（评论三态/防双提交/过期暂存）、E（发帖 v2 占位）、G（前进后退/深链/刷新）、H（loading/empty/error/no-permission，含 no-permission 深链与 offline error）。复用前面阶段 `e2e/fixtures/auth.ts` 的 `loginAs`。

**Files:**
- Create: `C:/Users/david/haoqi-online/e2e/courses.spec.ts`
- Create: `C:/Users/david/haoqi-online/e2e/fixtures/seedRefs.ts`

- [ ] 写 `e2e/fixtures/seedRefs.ts`（从 seed 暴露稳定引用，避免 e2e 里硬编码 UUID；这些 env 由 seed 脚本输出，前面阶段写入 `.env.test`）：

```ts
/** seed.sql 灌入后由预置脚本写进 .env.test 的稳定引用。 */
export const SEED = {
  publishedCourseId: process.env.E2E_PUBLISHED_COURSE_ID!, // 有已发布帖的课
  publishedPostId: process.env.E2E_PUBLISHED_POST_ID!,
  publishedPostTitle: process.env.E2E_PUBLISHED_POST_TITLE!,
  draftCourseId: process.env.E2E_DRAFT_COURSE_ID!, // teacher 负责、有草稿的课
  draftPostId: process.env.E2E_DRAFT_POST_ID!,
};
```

- [ ] 写 e2e `e2e/courses.spec.ts`：

```ts
import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";
import { SEED } from "./fixtures/seedRefs";

test.describe("课程空间 — 学生视角（§6.6 B/C/G/H）", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "student");
  });

  test("B: 列表→主页→详情看到已发布帖；草稿看不到", async ({ page }) => {
    await page.goto("/courses");
    // 头像栏存在
    await expect(page.getByRole("group", { name: "课程筛选" })).toBeVisible();
    // 综合流里有已发布帖
    await expect(page.getByText(SEED.publishedPostTitle)).toBeVisible();

    // 客户端筛选：只看这门课
    await page.getByRole("button", { name: /^只看/ }).first().click();
    await expect(page.getByText(SEED.publishedPostTitle)).toBeVisible();

    // 进课程主页
    await page.goto(`/courses/${SEED.publishedCourseId}`);
    await expect(page.getByText(SEED.publishedPostTitle)).toBeVisible();
    // 学生看不到「草稿」分区
    await expect(page.getByRole("heading", { name: /草稿/ })).toHaveCount(0);

    // 进详情
    await page.getByRole("link", { name: new RegExp(SEED.publishedPostTitle) }).first().click();
    await expect(page).toHaveURL(new RegExp(`/courses/${SEED.publishedCourseId}/posts/`));
    // 顶栏=课程名（归属）
    await expect(page.getByRole("link", { name: /课程/ })).toBeVisible();
  });

  test("B: 学生深链他人草稿 → no-permission，不泄露标题", async ({ page }) => {
    await page.goto(`/courses/${SEED.draftCourseId}/posts/${SEED.draftPostId}`);
    await expect(page.getByText("这条内容暂时不对你开放")).toBeVisible();
    await expect(page.getByRole("link", { name: "返回课程主页" })).toBeVisible();
  });

  test("C: 评论发表三态 + 刷新仍在 + 防双提交", async ({ page }) => {
    await page.goto(`/courses/${SEED.publishedCourseId}/posts/${SEED.publishedPostId}`);
    const body = `e2e 评论 ${Date.now()}`;
    await page.getByPlaceholder("写评论…").fill(body);
    await page.getByRole("button", { name: "发送" }).click();
    await expect(page.getByText(body)).toBeVisible();
    // 真落库：刷新仍在
    await page.reload();
    await expect(page.getByText(body)).toBeVisible();
  });

  test("C: 断网 → 失败态、保留输入、不假装成功", async ({ page, context }) => {
    await page.goto(`/courses/${SEED.publishedCourseId}/posts/${SEED.publishedPostId}`);
    const body = `e2e 断网 ${Date.now()}`;
    await page.getByPlaceholder("写评论…").fill(body);
    await context.setOffline(true);
    await page.getByRole("button", { name: "发送" }).click();
    await expect(page.getByText("没发出去，重试")).toBeVisible();
    await expect(page.getByPlaceholder("写评论…")).toHaveValue(body);
    await context.setOffline(false);
  });

  test("G: 前进/后退/刷新可恢复", async ({ page }) => {
    await page.goto("/courses");
    await page.goto(`/courses/${SEED.publishedCourseId}`);
    await page.goto(`/courses/${SEED.publishedCourseId}/posts/${SEED.publishedPostId}`);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/courses/${SEED.publishedCourseId}$`));
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/posts/${SEED.publishedPostId}$`));
    await page.reload();
    await expect(page.getByText(SEED.publishedPostTitle)).toBeVisible();
  });
});

test.describe("课程空间 — 老师视角（§6.6 B/E draft + 占位）", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "teacher");
  });

  test("E: 老师在本人课主页看到草稿分区 + 发帖 v2 诚实占位", async ({ page }) => {
    await page.goto(`/courses/${SEED.draftCourseId}`);
    await expect(page.getByRole("heading", { name: /草稿/ })).toBeVisible();
    await expect(page.getByText(/发帖功能 v2/)).toBeVisible();
  });

  test("E: 草稿详情评论区禁用，提示发布后可评论", async ({ page }) => {
    await page.goto(`/courses/${SEED.draftCourseId}/posts/${SEED.draftPostId}`);
    await expect(page.getByText("草稿 · 仅你可见 · 尚未发布")).toBeVisible();
    await expect(page.getByText("草稿尚未发布，发布后可评论。")).toBeVisible();
    await expect(page.getByPlaceholder("写评论…")).toHaveCount(0);
  });
});
```

- [ ] 跑 e2e（需本地 dev server + 种子库已起；前面阶段 `playwright.config.ts` 配了 `webServer`）：`cd C:/Users/david/haoqi-online && npm run test:e2e -- e2e/courses.spec.ts`。

- [ ] 跑全量门槛确认本阶段无回归：`cd C:/Users/david/haoqi-online && npm run lint && npm run test && npm run build`。

- [ ] commit：
```bash
cd C:/Users/david/haoqi-online
git add e2e/courses.spec.ts e2e/fixtures/seedRefs.ts
git commit -m "test(e2e): 课程空间端到端覆盖 §6.6 B/C/E/G/H

列表→主页→详情→评论；草稿可见性、no-permission 深链、断网失败态、路由恢复

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

> **阶段 5 收尾验证（整阶段，对照 §6.6）：** 跑 `npm run lint && npm run test && npm run build && npm run test:e2e -- e2e/courses.spec.ts` 全绿，确认本阶段满足 **B**（三级页已发布可见/草稿学生不可见）、**C**（评论三态/防双提交/过期暂存/真落库）、**E**（发帖 v2 占位 + 草稿评论禁用）、**G**（前进后退/深链/刷新）、**H**（四屏 loading/empty/error/no-permission，no-permission 与 offline error 可触发）。

---

本阶段计划已写完。说明几处与其他阶段的衔接约定（整合者请核对，避免接口漂移）：

- **依赖前面阶段交付物（本阶段直接 import，未重复定义）**：`lib/supabase/server.ts#createClient`、`lib/supabase/client.ts#createClient`、`lib/supabase/admin.ts#createAdminClient`、`lib/auth.ts#getCurrentUser`、`lib/types.ts#Database`、`components/ui/StateBlock`、`components/ui/Avatar`、migration 提供的 RLS 函数 `post_is_readable/can_post_course/course_role` 与 Storage `post-assets` private bucket policy、`supabase/seed.sql` 的 published/draft Post + PostAsset + Comment、`e2e/fixtures/auth.ts#loginAs`、`playwright.config.ts` 的 `webServer`、Vitest/RTL 配置。
- **本阶段需要前面阶段补的两个 RPC（请在数据库/migration 阶段加入，本阶段已假定存在并调用）**：
  - `courses_with_latest_post()` → 返回 `{ id, name, short_name, avatar_url, created_at, latest }`（每门可读课 + 该课最新已发布 `published_at`），供 `getCoursesForFilter` 排序「有新动态靠前」。
  - `can_post_course(cid uuid)` 已在 spec §3.0 定义为函数，本阶段经 `supabase.rpc('can_post_course', { cid })` 调用（`canManageCourse`）。
- **本阶段需要的 e2e/seed 引用环境变量**（请在 seed/预置脚本阶段输出到 `.env.test`）：`E2E_PUBLISHED_COURSE_ID / E2E_PUBLISHED_POST_ID / E2E_PUBLISHED_POST_TITLE / E2E_DRAFT_COURSE_ID / E2E_DRAFT_POST_ID`；RLS 集成测试需要 `SEED_TEST_PASSWORD / SEED_STUDENT_EMAIL / SEED_TEACHER_EMAIL`（种子账号用密码登录跑 RLS 断言）。

阶段产出文件清单（绝对路径）：
- 数据层：`C:/Users/david/haoqi-online/src/lib/queries/courseFeed.ts`、`.../courseHome.ts`、`.../postDetail.ts`、`.../assets.ts`、`C:/Users/david/haoqi-online/src/lib/format/text.ts`、`.../queries/__rls__/postVisibility.int.test.ts`
- 组件：`C:/Users/david/haoqi-online/src/components/post/`（`CourseChipBar` / `PostFeed` / `CourseFeedSection` / `Markdown` / `ImageCarousel` / `CommentBox` / `CommentList` / `CommentSection` + 各 `.module.css` + 各测试）
- 页面：`C:/Users/david/haoqi-online/src/app/(shell)/courses/page.tsx` 及子路由 `[courseId]/page.tsx`、`[courseId]/posts/[postId]/page.tsx`（含各自 `loading.tsx`/`error.tsx`/`*.module.css`）+ `[courseId]/posts/[postId]/actions.ts`
- e2e：`C:/Users/david/haoqi-online/e2e/courses.spec.ts`、`.../e2e/fixtures/seedRefs.ts`