# 好奇 Online — 首切片设计 spec（首页 + 官方课表 + 课程动态）

> 本文件是「好奇 Online」首切片的完整设计规格，交给实现者和一群学生 vibe-coder。它已逐条吸收五份评审（handoff 忠实度 / RLS 安全 / 页面状态 / 范围 / 意图）的发现：能当场改的已改；确需延后的，已写明「延后到 vX，原因…」并在结尾「开放问题」集中列出需负责人拍板的决策点。
>
> **统一术语声明（贯穿全篇，先读这条）：**
> - 数据模型对象名一律用：`User、Term、Course、CourseMembership、ScheduleSlot、ScheduleChange、Post、PostAsset、Comment`。
> - `User` 这一领域对象在数据库里**物理实现为 `public.profiles` 表**（凭证在 Supabase 自带的 `auth.users`，业务字段在 `profiles`）。下文凡说「User 表」即指 `public.profiles`，不再出现第二套字段定义——**§5.2 的字段表是唯一权威，§3.1 引用它，不重复定义。**
> - 全局角色（`profiles.role`）：`student / teacher / admin`。课程角色（`CourseMembership.role`）：`member / teacher / assistant`。两者叠加，互不替代。
> - 账号状态字段统一叫 `account_status`（枚举 `invited / active / suspended`），与「个性签名」`bio`（可空文本）是**两个独立字段**，不再混用 `profile_status`。花名册关联字段统一叫 `roster_ref`（不再出现 `roster_name`）。

---

## 1. 概述 / 目标 / 范围

### 1.1 产品一句话与本切片定位

**好奇 Online** 是把好奇学习社区的课程、正在发生的事、协作项目、阅读、活动和日常，变成一个轻巧、鲜活、可留痕的线上共同空间。它同时是成员的日常工作台、社区的记忆库、对外可展示的窗口。核心原则贯穿始终：**它应该像一个有人在生活的社区，而不是一套冷冰冰的学校管理系统。**

本文件规格的是 **「首切片」(first slice)**，不是整站，也不是某个阶段的最终形态。

- **它是什么：** 把现有静态前端原型（暖白纸感 + 海军蓝 + 黄/珊瑚/蓝/薄荷绿语义色的那一套视觉与信息架构）搬进真正的应用骨架（Next.js + Supabase），并让其中 **两个空间——「此刻」首页和「课程」——跑通从登录成员到真实数据库的完整闭环**。
- **它不是什么：** 它不是把七个空间一次性接通的整站发布；不是 Notion 克隆，也不是校园 OA / 管理后台；不是对已锁视觉方向的重做。其余五个空间（我的一周、信用积分、阅读联赛、做事空间、大家在干嘛）在本切片里 **只作为诚实的「建设中」占位**存在，入口可见、可点，但不假装能用。

一句话定位：**首切片 = 真地基（脚手架/部署/登录/角色）+ 真外壳（原型视觉移植）+ 两个空间的真数据（此刻 + 课程），其余诚实占位。**

### 1.2 关于技术栈与迁移的前提（诚实声明）

本切片的技术栈（Next.js App Router + TypeScript + Supabase，部署 Vercel + Supabase 云）以及「把原型迁进 Next 应用、重组仓库」这一动作，在共享背景里被列为**已锁定决策**。本 spec 基于这些决策展开。

**但诚实交代（吸收 handoff 评审 high）：** handoff 原文在 S1/S5/S10/任务 A 处把「最终用什么栈、是否迁移」**保留给负责人确认**，并警告不要在确认前做大爆炸式重写。共享背景将其标为「已锁定」，本 spec 据此推进；若负责人尚未对「迁移到 Next/Supabase 并重建仓库」给过明确口头确认，则 **§4（技术架构）与 §6（仓库/部署）应被视为「候选实施方案，待负责人最终拍板」**，而非既成事实。此点列入结尾「开放问题」第 1 条，请负责人一句话确认后再大规模动工。

### 1.3 本切片目标（按优先级）

1. **立住地基（P0）。** Next.js (App Router) + TypeScript + Supabase 脚手架可部署到 Vercel + Supabase 云，环境变量与密钥有明确管理方式，约 40 名学生能以 vibe-coding 方式并行开发不同模块——模块边界要清晰、对新手友好。
2. **登录与身份可用（P0）。** Supabase 邮箱魔法链接（magic link）邀请制登录跑通；账号从现有花名册预置；登录后能拿到带 `role`（student / teacher / admin）的真实身份。
3. **外壳视觉不回归（P0）。** 把原型的侧栏导航 + 顶栏 + 纸感设计 token 忠实搬进 Next，七个空间入口都在；桌面与窄屏都不发生明显视觉退化、内容不横向溢出。
4. **「此刻」首页接真数据（P0）。** 首页呈现今天的课（真 `ScheduleSlot` + 调课 `ScheduleChange`）、课程综合动态流（真 `Post`，带横滑课程头像筛选）、以及一段基于真数据的「最近社区动态」只读区（见 §2.1.5，守住「有人在生活」的味道）；积分卡、阅读卡做诚实占位。
5. **「课程」空间接真数据（P0）。** 课程列表（头像栏 + 卡片）→ 课程主页（头像/名称/简介 + 动态瀑布流）→ 动态详情页（顶栏=课程头像+名称、作者只放头像、图片组横滑、Markdown 正文、独立评论区），三级页面用真数据跑通。
6. **权限在服务端兜底（P0）。** 发帖权限、可见范围由 Supabase RLS 行级权限兜底，**不靠前端藏按钮**。
7. **每个屏幕想全状态（P0）。** 凡接真数据的界面都覆盖 loading / empty / error / no-permission / draft / published 六种状态（不触发的格子显式标 N/A，见 §2 各表）；写真实数据的按钮有加载/成功/失败态，不假装提交成功。

### 1.4 范围（IN）— 本切片要做的

- **地基**
  - [ ] Next.js (App Router) + TypeScript + Supabase 脚手架
  - [ ] Vercel + Supabase 云部署、环境变量与密钥管理（含机器化卡点，见 §4.3）
  - [ ] 统一的页面状态类型（loading / empty / error / no-permission / draft / published）
- **登录 + 身份 + 角色**
  - [ ] Supabase 邮箱魔法链接登录（邀请制）
  - [ ] 从现有花名册预置账号（机制见 §5）
  - [ ] 角色 student / teacher / admin，登录后可用
- **外壳移植**
  - [ ] 侧栏导航 + 顶栏 + 纸感设计 token 搬进 Next，视觉对齐原型
  - [ ] 七个空间入口全部在位（= 六个主空间 + 「我的一周」，见 §2.0 脚注）
  - [ ] 仅「此刻」「课程」接真数据，其余 5 个为诚实「建设中」占位
- **首页（真）**
  - [ ] 今天的课：真 `ScheduleSlot` + 调课 `ScheduleChange`
  - [ ] 课程综合动态流：真 `Post`，带横滑课程头像筛选
  - [ ] **最近社区动态（只读）**：基于真 `Post / Comment` 派生的「最近有人在……」列表（不接「大家在干嘛」写功能）
  - [ ] 调课走横幅通知 + 课表卡片标红（不替换课程实体，入口始终在）
  - [ ] 积分卡 / 阅读卡 = 诚实占位
- **课程空间（真）**
  - [ ] 课程列表（横滑头像栏 + 综合动态流；有更新的靠前并带新动态标记；头像兼具「进主页」与「原地筛选本页流」，见 §2.2.1）
  - [ ] 课程主页（头像/名称/简介 + 动态瀑布流/标题流）
  - [ ] 动态详情页（顶栏课程头像+名称、作者仅头像、图片组横滑、Markdown 正文、独立评论区，评论不写入正文）
  - [ ] 纯文字动态也支持（瀑布流封面=写着标题的图），不强迫伪装成图文笔记
- **评论（唯一真正落库的成员写操作）**
  - [ ] 所有登录成员对可见的已发布 Post 可评论，带加载/成功/失败三态 + session 过期兜底（§2.2.6）
- **选修**
  - [ ] 先显示「大选修 / 小选修」标签（具体选修课待选课结果公布后映射，放后面）
- **数据模型（统一命名）**
  - [ ] User(=profiles)、Term、Course、CourseMembership、ScheduleSlot、ScheduleChange、Post、PostAsset、Comment
  - [ ] 调课写 `ScheduleChange`，绝不覆写 `Course` / `ScheduleSlot`
  - [ ] 所有可编辑内容记 `author_id` + 时间；权限服务端（RLS）兜底
  - [ ] **Post / PostAsset 数据来源 = seed 预置 / 管理员后台灌入**（本切片不做发帖编辑器，见 §1.5「关键范围裁决」）

### 1.5 关键范围裁决：发帖怎么来（吸收 scope 评审 high）

评审指出一处致命范围裂缝：全篇详尽规格了「读 Post、发评论」，却从未定义老师**怎么创建/发布一条 Post**（没有编辑器、没有 Markdown 输入、没有上传 UI、没有 draft→published 操作入口），而验收却要求「老师在界面发布一条 Post」——自相矛盾，会逼实现者临时自创发帖界面（违反诚实占位）。

**本切片裁决（方案 A，最小且诚实）：**
- **首切片不做发帖 UI、不做图片上传 UI。** `Post / PostAsset` 的演示数据由 `supabase/seed.sql` 或管理员通过脚本 / Supabase 后台直接灌入（至少预置：每门课若干条 `published` Post + 至少 1 条 `draft` Post 用于验收草稿可见性）。
- **图片文件**由管理员手动放进 Storage bucket，`PostAsset.storage_key` 在 seed 里写好；前端只做**读图**（Server 端为已发布 Post 的图生成签名 URL 供横滑展示）。
- 课程主页里「＋ 发布第一条」之类入口在本切片是**诚实占位**（标「发帖功能 v2」），不放会触发假提交的表单。
- **§6.7 验收清单据此改写**：核心闭环验收为「通过 seed 预置一条已发布 Post + 一条草稿 Post → 学生能看见已发布、看不见草稿 → 能评论」，不要求「老师在界面点发布」。

> **延后到 v2：** 最小发帖编辑器（标题 + Markdown textarea + 图片上传 + 发布/存草稿）、图片上传链路（Storage 写入 Server Action + 上传三态 + 服务端文件校验）、多人协作编辑、素材池。原因：首切片聚焦「读闭环 + 评论写闭环 + 地基/登录/权限范式」，发帖编辑器是独立且较大的一块，单独切片更稳。

### 1.6 范围（OUT）— 本切片明确不做（必须诚实标注，不得假装做了）

- [ ] **发帖编辑器 / 图片上传 UI / draft→published 操作入口**（延后 v2，见 §1.5）
- [ ] **信用积分 / 签到 / 请假** 的真功能（仅占位）
- [ ] **阅读联赛** 真功能（仅占位）
- [ ] **做事空间** 真功能（仅占位）
- [ ] **大家在干嘛** 的**写功能**（发状态/找搭子/投票，仅占位）——注意：首页「最近社区动态」只读区（§2.1.5）是基于真 Post/Comment 的派生展示，**不属于** OUT，OUT 的是写功能
- [ ] **「我的一周」个人并行视图**——v1 首页只读官方课表；个人删课/留时段/公开私密开关放 v2
- [ ] **成员自由发帖**（v1 仅老师/课程负责人发帖）
- [ ] **多人协作编辑、版本历史、素材池**
- [ ] **PDF / 文档 / 表格 / 外链嵌入预览**——见下方衔接说明
- [ ] **实时推送、通知中心、全局搜索**（顶栏搜索/通知钮做诚实禁用态，见 §2.4）
- [ ] **游客 / 对外展示页面、管理后台 UI**
- [ ] **任何收费 / 支付 / 报名付款**

> **关于富内容类型的衔接说明（吸收 handoff + intent 评审）：** handoff §2.3（标「很重要」）原文要求课程内容页支持 **Markdown、图片组、PDF、文档、表格、外链预览**。本切片**仅因范围收敛**先做 **Markdown + 图片**，PDF/文档/表格/外链预览是**首切片砍、后续切片补**（非产品方向变更）。`PostAsset.asset_type` 已为这些类型留位（枚举见 §3.8）。详情页遇到正文里的此类链接时按纯链接文本处理，不伪造预览卡。
>
> **诚实铁律：** 以上每一项在界面里出现时（占位空间、未接通的按钮），必须明确标注「建设中」或「尚未接后端」；示例姓名、积分、日期、活动均为演示数据，不得当真。

### 1.7 明确的非目标（写在前面，免得被带偏）

1. **这是首切片，不是整站。** 价值是先让两个核心空间「真的可用」，把地基、登录、视觉外壳和数据/权限范式立正确，给后续模块当样板。
2. **不重做已锁定的决策**（技术栈、第一批真数据模块、v1 发帖权限、登录方式、可见范围、角色定义）；不暗中切换方案。
3. **不推翻已锁定的视觉方向**（不整体换黑白/玻璃/赛博朋克；不引臃肿组件库抹平卡片；不把中文标题换成巨大英文 hero；不为「统一」抹掉不规则形状与手工感；不给每页套同一个「数据卡+表格+操作栏」模板）。
4. **不做假后端、假能力、假数据闭环。** 未接后端的界面一律诚实标注；不承诺做不到的能力；OUT 清单功能不以任何形式伪装成已完成。
5. **不擅自扩张范围。** 本文件没说清的，先提一个小问题或采用最保守、可逆的实现，不凭旧设计或个人偏好加戏。

---

## 2. 信息架构与 UX 流程（首页 + 课程空间）

> 本节只覆盖首切片真数据的两个模块——**首页（此刻）** 与 **课程空间**。其余 5 个空间入口在导航里照常存在，但本切片一律是诚实占位（§2.4）。
>
> 所有屏幕沿用原型外壳：左侧 `.sidebar`（导航 + 集体好奇心卡 + 个人按钮）+ 顶部 `.topbar`（面包屑 + 搜索/通知/「发起一件事」）+ 右侧 `.main-content` 内的 `.view` 区。本切片**不新增导航项、不改色彩语义**。

### 2.0 页面地图与路由

本切片共 4 类真数据屏幕 + 1 个登录页：

```
未登录 ──→ /login（magic link 入口）
              │ 点邮件链接回调 /auth/callback
              ▼
/（此刻 / 首页）  ← 登录后默认落地
   ├─ 今天的课（ScheduleSlot + 当天 ScheduleChange）
   ├─ 调课横幅（当天 ScheduleChange 聚合）
   ├─ 课程综合动态流（横滑课程头像筛选 + Post 流，首页截断版）
   ├─ 最近社区动态（只读，派生自真 Post/Comment，见 §2.1.5）
   └─ 诚实占位卡（积分 / 阅读）

/courses（课程列表）
   ├─ 横滑课程头像栏（有更新靠前 + 新动态点；点头像=进主页，另有筛选入口=原地筛选本页流）
   └─ 课程综合动态流（跨课程，按 published_at 倒序）
        │ 点课程头像
        ▼
/courses/[courseId]（课程主页，小红书用户主页式）
        │ 点某条动态封面
        ▼
/courses/[courseId]/posts/[postId]（动态详情，小红书笔记页式）
```

路由用 Next App Router；浏览器前进/后退、刷新、直接粘贴 URL 都要能恢复到对应屏（替代原型用 hash 切 view）。

> **七空间脚注（吸收 handoff 评审 low）：** handoff §2.1 标题列「六个主空间」，「我的一周」在 §2.4 单列；原型 DOM 有 7 个 nav 项。故 **7 个入口 = 六主空间 + 「我的一周」**，本 spec 的「7 个空间」表述据此，不矛盾。「我的一周」在本切片为**纯占位**（见 §2.4、§4.1 已统一），官方课表只在首页「今天的课」呈现。

**导航诚实标记规则：** 侧栏 7 入口中只有「此刻」「课程」点进去是真数据；另 5 个是占位页。占位入口在导航上**不加**「新动态」标记，占位页内必须自报「建设中」。

---

### 2.1 首页（此刻）——一张「今天」的社区切片

首页职责（handoff §2.2）：先回答**今天我该去哪、有什么新事、社区在发生什么**，不做功能九宫格。本切片它由若干区块组成，**「今天的课」「调课横幅」「课程综合动态流」「最近社区动态」是真数据**，积分卡 / 阅读卡是诚实占位。

#### 2.1.1 屏幕构成（文字线框，桌面）

```
┌──────────────────────────────────────────────────────────────┐
│ TOPBAR：好奇学习社区 / 此刻   ⌕(禁用) ♧(禁用) [＋发起(占位)]    │
├──────────────────────────────────────────────────────────────┤
│ HERO（.hero）                                                   │
│  2026 / 春季 · 第 N 周（来自 active Term，真）   ┌─────────┐   │
│  星期X，<慢一点>也没关系。（问候，静态文案）     │ 天气球   │   │
│  今天有 N 节课。（N=当天真实 slot 数；见退化文案）└纯装饰   ┘   │
│  ⚠ 天气球=纯装饰，不接气象 API，无任何温度数字/实时 aria 文案  │
├──────────────────────────────────────────────────────────────┤
│ 调课横幅（.notice-banner）——仅当当天有可见 ScheduleChange 时出现│
├──────────────────────────────────────────────────────────────┤
│ DASHBOARD-GRID（2 列）                                          │
│ ┌── 左列（宽）────────────┐  ┌── 右列（窄）──────────────┐   │
│ │ ① 今天的切片（真 Slot）  │  │ ② 最近社区动态（只读，真） │   │
│ │ ③ 课程正在发生（真 Post）│  │ ④ 信用积分卡（占位）       │   │
│ │   跨整行                 │  │ ⑤ 阅读联赛卡（占位）       │   │
│ └──────────────────────────┘  └────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**HERO 文案退化（吸收 states + intent 评审 low）：**
- 「今天有 N 节课」——N 由真 `ScheduleSlot` 得出；N=0 时退化为「今天没有排课，留给自己」。
- 原型那句「N 件正在长出来的事」指向 OUT 的做事空间，**无真实来源，一律删除**（不出现任何无来源数字），与 §2.1.3 对 footer 假数字的处理一致。
- 天气球移植时**去掉**原型写死的「多云,22 摄氏度」具体 aria-label，改为「装饰图，非实时天气」或直接移除天气球（二选一，见开放问题）。

#### 2.1.2 区块①「今天的切片」——今天的课（真数据）

- **数据源：** active Term 下、`weekday = 今天` 的 `ScheduleSlot`，按 `starts_at` 升序；叠加当天匹配的、用户可见的 `ScheduleChange`（见 §2.3）。首页只读**官方课表**，不混入个人计划。
- **时区基准（吸收 scope 评审 low）：** 所有时间按社区本地时区 **Asia/Shanghai** 解释，`ScheduleSlot.starts_at` 等口径统一，避免 UTC 误差导致「今天的课」错一天。
- **每行（`.class-row`）：** 时间（等宽字体）｜课程语义色块｜课程名 + 一句副文（地点 / 选修类型）｜右侧动作钮。
- **行状态变体：**
  - `.now`「正在发生」：`starts_at ≤ now ≤ ends_at`。**「正在发生 / 还有 N 分钟」按页面加载时刻计算并标注「刷新更新」**（吸收 scope 评审 low：Server 端算的是快照，不随时间走动；本切片不强制做客户端定时器，明确「刷新更新」即可，可选轻量定时器列入开放问题）。
  - 普通将来 / `.now`：右侧动作钮统一为明确的**「→ 查看课程」**，进 `/courses/[courseId]`。**不使用「···（更多）」图标**（吸收 states 评审 high：单一动作用「更多」图标是在暗示不存在的操作集，属诚实纪律反例）。
  - `.changed`「变更」：命中 location/time/note 类 `ScheduleChange`，珊瑚色 `.change-tag`，副文显示**变更后的值**，并保留原课程入口（铁律：绝不替换课程实体）。
  - `cancelled` 类变更：行 `.muted` 置灰 + 删除线标题 + 「今日停课」标签；课程入口仍可点。
  - 选修槽（`slot_kind = large_elective / small_elective`）：只显示「大选修 / 小选修」标签，副文用中性措辞**「具体选修课待选课结果公布后映射」**（吸收 intent 评审 medium：不要写成「个人课程映射建设中」，避免与 OUT 的「我的一周」个人视图混淆），不伪造课名。
- **空时段（slot_kind = free）：** 显示「自由发生 / 留一扇门开着」，右侧 `＋` 钮在本切片统一为**禁用态 + aria-label 说明「为时段添加计划属『我的一周』，建设中」**，**不弹任何承诺性气泡**（吸收 states 评审 high：统一裁决为禁用态，不给「提示气泡」逃生口，避免变成死交互/假提交）。

#### 2.1.3 区块③「课程正在发生」——综合动态流（真数据，首页内嵌版）

与 §2.2.1 课程列表页动态流**共用同一数据契约与组件**，差别只在首页截断（取最近 N 条 + 「全部动态 →」跳 `/courses`）。

- **横滑课程头像筛选条（`.course-filter`）：** 第一颗「全部 N」选中态；其后每门**可见且有已发布 Post** 的课程一颗 `.course-chip`。横滑、窄屏不溢出。点击切筛选，**只在客户端过滤已取到的流**，不跳页。
- **动态卡（`.feed-item`）：** 课程小头像 + 课名 + 相对时间｜标题（Post.title）｜摘要（见下方截断规则）｜footer（封面、评论数 `💬 n`）。点整卡 → 动态详情。
- **摘要截断（吸收 states 评审 medium）：** 摘要取 `Post.body_markdown` 纯文本（不渲染 md），按**字素簇安全截断**（用 `Intl.Segmenter`，避免截出半个 emoji），定长约 80 字 + 省略号。
- **可见性：** 只列 `status = published` 且可读课程的 Post（RLS 兜底）。草稿绝不出现在首页流。
- **诚实边界：** footer 互动数字**要么接真实计数、要么去掉**，不保留无来源假数字。`💬 n` 必须是 `Comment` 真实计数（可为 0）。

#### 2.1.4 区块④⑤ 诚实占位卡（积分 / 阅读）

- 保留原型视觉（黄色旋转积分卡、蓝色书脊阅读卡）以维持气质，但**必须明确标注未接后端**：大数字（98/100、2h40m）替换为「—」或「建设中」，并加一行小字「积分系统建设中 / 阅读联赛建设中」。卡右上箭头 → 进对应占位页（§2.4），不进假详情。

#### 2.1.5 区块②「最近社区动态」——守住「有人在生活」（吸收 intent 评审 high）

评审指出：把首页「大家正在 / 同学在干嘛」整块砍成积分/阅读占位，会抽掉首页最能体现「有人在生活的社区」的部分，让首页退回成「今天的课 + 动态流」的工具感，伤及本次要守的核心原则。

**本切片处理：保留「最近社区动态」为一段诚实的、基于真数据的只读列表。**
- 区分两件事：①「大家在干嘛」的**写功能**（发状态/找搭子/投票）= OUT，本切片不做；②首页**只读地展示**社区最近活动 = 完全可基于已锁真数据做。
- **数据源（全派生自真数据，无假数字）：** 最近的已发布 `Post`（谁在某课发了什么）+ 最近的 `Comment`（谁评论了哪条），合成一条「最近有人在……」的时间线（如「林元 在『城市漫游』发了新动态 · 2h」「思齐 评论了『问题与方法』· 1h」）。只放头像 + 课程归属 + 相对时间，点击进对应动态详情。
- **诚实边界：** 这不是「大家在干嘛」状态流的真功能；不显示「N 人在线」「N 人正在看」这类无来源数字。区块标题用「最近社区动态」而非暗示实时在线。
- **若某社区暂无任何 Post/Comment：** 走 empty 态「社区还很安静，等第一条动态」，**不**用积分/阅读占位卡顶替整列（不让首页退回工具感）。

#### 2.1.6 首页六态表现

| 状态 | 触发 | 表现 |
|---|---|---|
| **loading** | 首屏数据未回 | HERO 周次、今天的课、动态流、最近社区动态分别用骨架屏（对应形状灰块脉冲）。横幅、占位卡在数据未定前不闪现「无变化」。不可先渲染假数据再替换。 |
| **empty** | 今天无课 / 无已发布动态 / 无社区活动 | 今天的课：空态「今天没有排课，去做点不实用的事」+ 进课程的轻入口。动态流：「最近还没有课程更新」+「去看看课程 →」。最近社区动态：「社区还很安静，等第一条动态」。横幅区无变化时整条不出现（不占空白条）。 |
| **error** | 取数失败 | 对应区块就地显示「没加载出来，点这里重试」可重试块，保留页面其余可用部分，不整页崩。横幅取数失败时**不**展示横幅（宁缺勿误导）。 |
| **no-permission** | 已登录但某课程不可读 | 该课程 Post 不进流、其头像不进筛选条（服务端过滤）。**N/A：首页不渲染「无权限」红框**（被过滤掉根本到不了，避免暴露存在性）；真正的 no-permission 页只在深链直达不可读资源时出现（§2.2.6）。 |
| **draft** | **N/A** | 首页流默认不混入草稿（保持「此刻=已发生的事」纯净）。草稿的可见与管理在课程主页（§2.2.3），首页**无 draft UI**。 |
| **published** | 正常 | 如 §2.1.2–2.1.5 渲染。 |

---

### 2.2 课程空间——从「关注页」到「笔记页」

忠实还原 handoff §2.3：**横滑课程头像栏 + 按更新时间排序的综合动态流（进课前就看到最近发生什么）→ 小红书用户主页式课程主页 → 小红书笔记页式动态详情（顶栏归属是课程、作者只放头像）→ 独立评论区**。

#### 2.2.1 课程列表页 `/courses`（「关注页」式总览）

```
┌──────────────────────────────────────────────────────────────┐
│ 标题区：COURSE FEED / 第 N 周   每门课，<都在长出>自己的宇宙。 │
├──────────────────────────────────────────────────────────────┤
│ ▶ 横滑课程头像栏（关注页式，可横向滚动）                       │
│  (问)•  (城)•  (读)   (做)   …  ← 带 • 的=有新动态，靠前        │
│   点头像=进该课主页（主操作）；长按/旁置「只看本课」入口=原地  │
│   筛选下方综合流（次操作）                                     │
├──────────────────────────────────────────────────────────────┤
│ ▦ 综合动态流（跨所有可见课程，按 published_at 倒序）           │
└──────────────────────────────────────────────────────────────┘
```

- **头像栏（核心交互，吸收 intent 评审 high）：** 一行横滑课程头像。排序：**有新动态的课程靠前**（按该课最近一条已发布 Post 的 `published_at`），其余按固定序（Course 创建序）。
  - **交互不二分、不砍能力：** 头像**既能点进课程主页（主操作）**，**也保留「在本页筛选综合流」的轻交互（次操作）**——这才是 handoff「先扫一眼全局再决定进哪门课」的关注页体验。实现上：点头像=进主页；筛选用一个明确入口（如头像下方/旁边的「只看这门课」chip，或沿用原型 `.course-chip` 的 `data-filter` 交互）。**不要**把列表页「按课程筛选综合流」的能力悄悄砍掉。
  - 头像右上小圆点 = 有新动态；每颗可聚焦、有 `aria-label`（课名 + 是否有新动态）。
- **「有新动态」的判定（吸收 intent / scope / handoff 多条评审，改为无状态规则）：**
  - 本切片**不引入 localStorage 个人已读机制**（那是 handoff 未要求、且会替负责人拍板「什么叫新、跨设备是否一致、何时清零」的隐性产品决策，还有 SSR 读不到 localStorage 的 hydration 闪烁问题）。
  - 改用**纯派生、无状态、跨设备一致**的规则：**「该课最近一条已发布 Post 的 `published_at` 在最近 N 小时内」**（N 默认 48，可调）即视为「有新动态」。只看 `published_at`（老师编辑已发布帖不算新）。
  - 这样避免「换设备/清缓存满屏红点」「localStorage 不可用时静默失败」等问题，也符合诚实纪律（标记是可解释的派生态，不冒充服务端未读账本）。「个人已读」系统列入开放问题，交负责人决定是否在后续切片做。

#### 2.2.2 课程列表页六态

| 状态 | 表现 |
|---|---|
| **loading** | 头像栏 5–6 个灰圆骨架；动态流 3–4 个 `.feed-item` 骨架。 |
| **empty** | 用户无任何可见课：整页空态「你还没有加入任何课程 / 等老师把你加进花名册」。有课但全无已发布动态：头像栏正常 + 流区空态「课程们还很安静，等第一条动态」。 |
| **error** | 头像栏与流各自可重试；一个失败不拖垮另一个。 |
| **no-permission** | **N/A（正常不出现）**：登录成员可读所有课程已发布内容（决策已锁）；个别不可读课程直接不出现在头像栏与流中（服务端过滤）。 |
| **draft** | 老师视角：本人课程草稿不进综合流，进该课主页才见草稿区（§2.2.3）。学生视角：**N/A**（永不见草稿）。 |
| **published** | 正常渲染。 |

#### 2.2.3 课程主页 `/courses/[courseId]`（小红书「用户主页」式）

```
┌──────────────────────────────────────────────────────────────┐
│ 课程档案头：(问)头像  问题与方法                               │
│   一句简介…   负责老师头像组 · 24 名成员 · 本学期             │
├──────────────────────────────────────────────────────────────┤
│ [ 全部 ]  [ 仅图文 ]  [ 仅文字 ]   ← 轻量本地筛选（可选）      │
├──────────────────────────────────────────────────────────────┤
│ 该课内容瀑布流 / 标题流（仅本课已发布 Post，倒序）             │
│  纯文字 Post：封面=写着标题的色块图；图文 Post：封面=首图      │
│  （老师视角额外有「草稿」分区，明显 draft 标记）              │
└──────────────────────────────────────────────────────────────┘
```

- **档案头：** 课程头像（大）｜课名｜简介（`Course.description`，无则克制占位「这门课还没写简介」，不编造）｜负责人头像组（来自 `CourseMembership.role in (teacher, assistant)`，只放头像不强调名字）｜成员数（有 `CourseMembership` 真数据则显示，否则标「建设中」，不编造）。
- **内容流：** 只取本 `course_id` 的已发布 Post，按 `published_at` 倒序。**封面规则忠实 handoff**：有图用首张 `PostAsset(image)`；纯文字用「写着标题的色块图」（用课程语义色生成，不放假照片）。
- **标题色块图标题超长（吸收 states 评审 medium）：** 做单/双行截断 + 省略号，不撑破瀑布流卡片。

#### 2.2.4 课程主页六态

| 状态 | 表现 |
|---|---|
| **loading** | 档案头骨架 + 内容流卡片骨架。 |
| **empty** | 课程存在但无已发布 Post：档案头正常 + 内容区空态「这门课还没有公开的动态」。老师视角的「＋ 发布第一条」是**诚实占位**（「发帖功能 v2」），不放假入口。 |
| **error** | 档案头取数失败→整页可重试；内容流失败→仅流区可重试，档案头保留。 |
| **no-permission** | 深链到不可读课程（草稿专属/未来私密空间触发）：克制无权限页「这门课的内容暂时不对你开放」+ 返回列表，不泄露标题。**服务端 RLS 必须真拦，不靠前端藏卡。** |
| **draft** | 老师/课程负责人视角：本人课程草稿 Post 以明显 draft 标记（灰边 + 「草稿 · 仅你可见」角标）单列「草稿」分区；点开进详情 draft 预览态。学生视角：**N/A**（服务端过滤，完全看不到）。 |
| **published** | 正常渲染。 |

#### 2.2.5 动态详情页 `/courses/[courseId]/posts/[postId]`（小红书「笔记页」式）

本切片交互最讲究的一屏，必须忠实还原 handoff 归属逻辑：

```
┌──────────────────────────────────────────────────────────────┐
│ 顶栏归属（焦点=页面归属，不是作者）                            │
│  [← ] (问) 问题与方法          发布者头像(无名字) · 时间       │
├──────────────────────────────────────────────────────────────┤
│ 图片组（PostAsset image，多图横滑，页码指示点；无图则省略）   │
├──────────────────────────────────────────────────────────────┤
│ 标题（Post.title）                                            │
│ Markdown 正文（渲染 body_markdown；PDF/表格/外链=纯文本链接） │
├──────────────────────────────────────────────────────────────┤
│ ── 评论区（独立栏，不写入正文）── 💬 评论 N                   │
│  [ 写评论…                         ] [发送]                   │
└──────────────────────────────────────────────────────────────┘
```

- **顶栏归属（铁律）：** 放**课程头像 + 课程名**（这条动态归属于课程空间）；发布者只放**头像、不放名字**（编辑者可能多人）。点顶栏课程名/头像 → 回课程主页。
- **图片组（吸收 states 评审 medium）：** `PostAsset` 中 `asset_type = image` 按 `sort_order` 横滑，带页码指示点、可键盘左右切换、每张有 alt。**软上限 ≤ 9 张**（超出截断并提示）；**0 或 1 张时不渲染指示点**；纯文字 Post 不渲染图块（不放占位假图）。
- **正文 vs 内联图（吸收 states 评审 medium）：** **本切片正文图片一律走 PostAsset 图片组；`body_markdown` 内不内联 `![]()` 图片**（避免「正文内联图」与「图片组」两套图重复/冲突）。正文渲染标题、列表、引用、行内强调、行内链接为文本。PDF/文档/表格/外链是 OUT，出现则按纯链接文本处理，不伪造预览卡。
- **超长正文（吸收 states 评审 medium）：** 本切片**默认全展开、不折叠**（详情页就是看完整内容的地方）；超长正文可加轻量阅读进度/锚点，但不做截断隐藏。
- **评论区（独立栏，关键）：** `Comment` 列表（作者头像 + 名 + 相对时间 + 正文）+ 底部输入框。**评论不写入正文**（与 `body_markdown` 物理分离）。所有登录成员可评论；写操作三态 + 并发/过期处理见 §2.2.6。

#### 2.2.6 动态详情页六态 + 评论写操作细则（吸收 states 评审 high）

| 状态 | 表现 |
|---|---|
| **loading** | 顶栏先用归属占位（课程色 + 灰名），图组/正文/评论分别骨架。不要先渲染上一条详情的残留。 |
| **empty** | 评论为空是常态：评论区「还没有人评论，来说第一句」+ 输入框照常可用。 |
| **error** | 正文取数失败→整页可重试块（保留顶栏返回）。评论取数失败→仅评论区「评论没加载出来，重试」，正文照常可读。 |
| **no-permission** | 深链到无权 Post（他人草稿、未来私密空间）：RLS 拦截，显示「这条内容暂时不对你开放」+ 返回课程主页，不显示标题/正文片段。 |
| **draft** | 仅作者/课程负责人可进入草稿详情，顶部通栏「草稿 · 仅你可见 · 尚未发布」标签；草稿态评论区**禁用**并说明「发布后可评论」。学生访问草稿 URL → 走 no-permission。 |
| **published** | 正常渲染；评论区开放。 |

**评论写操作（唯一真正落库的成员写操作，必须闭环）：**
- **防重复提交：** 发送按钮在 in-flight 期间 `disabled + loading`（用 `useFormStatus` / `useTransition`），禁止并发；双击/慢网络不写两条。
- **乐观更新与回滚：** 成功走**本地追加 + 后台校正**；失败**保留输入框内容并红字「没发出去，重试」**，不清空、不重复入库、不假装成功。
- **session 过期态（新增，吸收 states 评审 high）：** magic link session 会过期，用户停留良久后发评论可能命中「已登录→变未登录」。写操作返回 401 / 被 RLS 拒时，提示**「登录状态过期了，重新登录后你的评论会保留」**，把草稿暂存 localStorage，**不静默吞掉**。
- 未登录态正常不应到达此页（登录前置），但上面的过期兜底必须做。

---

### 2.3 调课在两个模块里的统一呈现（ScheduleChange，绝不替换实体）

统一规则（铁律）：**调课写 `ScheduleChange`，不覆写 `Course`/`ScheduleSlot`；课程入口在任何情况下都不消失。**

- **同 slot 同天多条变更的渲染规则（吸收 states 评审 medium，与 §3.6 对齐）：** 横幅与课表卡片均取 **`(slot_id, occurs_on)` 上最新未软删的 `ScheduleChange`** 生效；**若该变更被撤回（软删），卡片恢复原状**（回落到官方 ScheduleSlot）。
- **首页横幅（`.notice-banner`）：** 聚合「当天、**当前用户可见课程**」的 `ScheduleChange`（指向用户当天课表里没有的 slot 的变更不进该用户横幅）。一条变更一行：`{时间} {课名} {变更类型动词}`（location→「改到 X」、time→「改到 X 时段」、cancelled→「今天停课」、note→直接显示 message）。多条可堆叠或「N 项变化，展开看」。
- **横幅「知道了」已读（吸收 states 评审 medium / scope 评审 medium）：** 关闭存 localStorage，**已读 key 用 `ScheduleChange.id`（不用内容）**，避免「撤回又重发（新 id）」被旧已读误抑制；key 带 `user_id` 前缀做账号隔离；这是 Client 端纯本地态（首屏 SSR 渲染「全部未读」，hydrate 后按 localStorage 收起，避免读 localStorage 的 hydration 闪烁）；诚实标注「本地已读、不跨设备」。localStorage 不可用时，降级为「每次都显示」而非阻塞。
- **time 变更导致时段冲突（吸收 states 评审 medium）：** 改到的新时段若与用户当天另一节课冲突，首页时间线**按新时间重排**，**保留冲突的两条都显示**（不互相吞），让用户自己看到撞车。
- **课表卡片标红：** 命中变更的 `.class-row` 加 `.changed`（珊瑚 `.change-tag`）显示变更后值并保留入口；cancelled 走 `.muted` + 停课标签但入口仍可点。
- **课程空间内：** 调课不污染课程动态流（流是 Post，不是排课）。课程主页是否加「近期排课变化」提示条本切片可不做（避免与首页重复）。
- **六态要点：** 无变更→横幅整条不出现；变更取数失败→不显示横幅；变更指向无权/非当天课表课程→该条不聚合。

---

### 2.4 其余 5 个空间 + 顶栏全局钮的诚实占位

**5 个占位空间（我的一周 / 信用积分 / 阅读联赛 / 做事空间 / 大家在干嘛）：**
- 进入后显示该空间标题 + 一句「这里正在建设中，先放着占个位」+（可选）一张气质静态示意图，**明确标注「未接后端 / 示例仅供感受」**。
- **不放**会触发假写入的按钮（签到/报名/投票）；若放则禁用 + aria 说明 + 「建设中」，绝不假装提交成功。
- 「我的一周」**本切片纯占位**（官方课表只在首页呈现，见 §2.0 脚注与 §4.1 已统一命名为占位页）。

**顶栏三个全局钮（吸收 states 评审 low，常驻每页，必须诚实处理）：**
- **搜索 ⌕**（全局搜索 OUT）→ 禁用态或点击给「建设中」提示。
- **通知 ♧**（通知中心 OUT）→ 禁用态 + **去掉原型的 notification-dot 假红点**。
- **「＋ 发起一件事」**（原型弹发起项目/活动/状态，全是 OUT 模块）→ 本切片**隐藏**，或点开只显示诚实占位；**绝不**弹出会触发假提交的发起表单（发帖在 v1 走课程内，且本切片连发帖编辑器都没有）。

---

### 2.5 跨屏一致的交互与可达性底线

- **窄屏：** 侧栏可展开（`.mobile-menu`）；头像栏、筛选条、图片组用局部横滑，**正文与卡片不横向溢出**。
- **可聚焦可点：** 课程头像、动态卡、动作钮、图片组左右切换、评论发送均可键盘聚焦；图标钮必须有 `aria-label`。
- **写真实数据的按钮三态：** 发评论加载/成功/失败三态齐全，失败保留输入，不谎称成功（详见 §2.2.6）。
- **未接后端必标注：** 天气球、积分卡、阅读卡、顶栏三钮、5 个占位空间、`＋` 加计划钮——全部显式标注建设中或去掉，不让任何示例数字被当真。
- **权限服务端兜底：** 草稿过滤、无权课程过滤、评论权限校验全由 RLS 决定，前端隐藏只是体验，不作安全边界。

---

## 3. 数据模型与权限（RLS）

> 本节只覆盖首切片真正接真数据的部分：登录身份 + 官方课表 + 课程动态。积分、出勤、个人计划、项目、阅读、活动的表**不在本切片建表**（首页里这些只做占位），由对应模块开工时那一节负责人补建，避免现在凭空冻结尚未确认的规则。
>
> **本节与 §5 的边界（消除评审指出的 User vs profiles 冲突）：** 领域对象 `User` 物理实现为 `public.profiles` 表，**字段权威定义在 §5.2**，本节 §3.1 只引用、不重复定义，并补充其 RLS。

设计铁律：
- **权限在服务端兜底**：所有读写靠 Postgres RLS，不靠前端藏按钮。
- **调课不覆写**：`ScheduleChange` 只追加，不允许 `UPDATE Course/ScheduleSlot` 表达「今天改了」。
- **所有可编辑内容记 `author_id` + 时间戳**，`author_id` 由服务端用 `auth.uid()` 写入，客户端不能伪造。
- **不可变列用触发器锁死**（不能只靠 RLS 的 `with check` 描述，见 §3.0 与各表）。
- **软删除**：用户可见内容（Post / Comment / PostAsset / ScheduleChange）用 `deleted_at` 标记删除，不物理删，保留记忆库属性；RLS 默认过滤已软删行。
  > **诚实标注（吸收 scope 评审 high）：** 软删 `deleted_at` 是规格者为「社区记忆库」属性自加的增强，handoff 未强制要求。本切片**纳入 IN**（撤回调课/删钓鱼评论后不复现，价值明确），但实现成本若紧张可降级为「可选增强」——列入开放问题供负责人取舍。
- **草稿可见性（单一事实来源，吸收 intent 评审 medium）：** `Post.status = 'draft'` 只有**作者本人、同课程的 teacher/assistant、admin** 能看；`published` 才对全体登录成员可读。**此规则在此处定义一次，首页/课程页/详情页/§5 全部引用它，不各自描述。** 注：handoff §2.5 原文是「草稿可见性由作者/空间规则决定」，本 spec 将其默认收口为上述规则，**这是 spec 替 handoff 做的默认收口，可被负责人调整**（开放问题列出）。

### 3.0 角色、辅助函数与不可变列锁（安全加固，吸收 rls 评审多条）

**角色两层**（同 §1 术语声明）：全局 `User.role`（student/teacher/admin，admin 跨课程兜底）；课程 `CourseMembership.role`（member/teacher/assistant，发帖看这层）。**单纯全局 teacher ≠ 能管任何一门课。**

**辅助函数（`SECURITY DEFINER`，必须加固——吸收 rls 评审 medium）：**

```sql
-- 所有 SECURITY DEFINER 函数统一：set search_path = pg_catalog, public；表名 schema 全限定；
-- revoke execute from public，仅 grant 给 authenticated；函数只读、只用 auth.uid()，不接受能改变查询目标的参数。

create function auth_role() returns text language sql stable security definer
  set search_path = pg_catalog, public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function is_admin() returns boolean language sql stable security definer
  set search_path = pg_catalog, public as $$
  select auth_role() = 'admin'
$$;

create function course_role(cid uuid) returns text language sql stable security definer
  set search_path = pg_catalog, public as $$
  select role from public."CourseMembership"
  where course_id = cid and user_id = auth.uid()
$$;

-- 可发帖/可管课（注意：本函数把 teacher 与 assistant 一视同仁，仅用于“发帖/发调课”，
-- 不可用于守 CourseMembership 写权——管成员仅限 teacher/admin，见 3.4）
create function can_post_course(cid uuid) returns boolean language sql stable security definer
  set search_path = pg_catalog, public as $$
  select is_admin() or course_role(cid) in ('teacher','assistant')
$$;

-- 帖子可读性（单一函数，供 Post/PostAsset/Comment/Storage 复用；显式收口 space_type='course'）
create function post_is_readable(pid uuid) returns boolean language sql stable security definer
  set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public."Post" p
    where p.id = pid
      and p.deleted_at is null
      and p.space_type = 'course'
      and (
        p.status = 'published'
        or p.author_id = auth.uid()
        or can_post_course(p.space_id)
      )
  )
$$;
```

**不可变列锁（BEFORE UPDATE 触发器，吸收 rls 评审多条 high）：** RLS 的 `using` 只判断旧行可见、`with check` 判断新行合法，但「哪些列不可改」最稳的是触发器。为下列内容表加 BEFORE UPDATE 触发器，强制不可变列 `NEW.x = OLD.x`：
- `Comment`：`post_id`、`author_id`、`created_at` 冻结。
- `Post`：`space_type`、`space_id`、`author_id`、`created_at` 冻结；并在 `status` 变为 `published` 时强制 `published_at = now()`，变为 `draft` 时强制 `published_at = null`（忽略客户端传值，吸收 rls 评审 low 的数据一致性项）。
- `PostAsset`：`post_id` 冻结。
- `ScheduleChange`：除 `deleted_at` 外**所有列冻结**（实现「只能撤回不能改写」，吸收 rls 评审 medium）。
- `CourseMembership`：`course_id`、`user_id` 冻结（防搬人）。
- `profiles`：非 admin 不能改 `role / email / account_status / roster_ref`（见 §3.1，吸收 rls 评审 high）。

通用约定：所有表 `enable row level security`；未登录（`auth.uid()` 为 null）一律读不到任何业务数据（首切片无游客页）。每张含 `deleted_at` 的表、每条对外可读 select 路径都必须带 `deleted_at is null`（吸收 rls 评审 low：建落地清单逐表核对，漏写会让软删内容复现）。

---

### 3.1 User（= `public.profiles`，成员）

**字段权威定义见 §5.2，此处不重复。** 关系：被 `Course.owner_id`、`CourseMembership.user_id`、`Post.author_id`、`Comment.author_id`、`ScheduleChange.published_by` 引用。

**RLS：**
- **select**：任一登录成员可读所有成员的**展示信息**（社区要看到彼此头像/名字）：`auth.uid() is not null`。
- **insert**：禁止普通用户自助插入（花名册预置）。仅 `is_admin()`；正式落地走后台脚本 / service-role，不暴露前端。
- **update**：本人可改自己的 `display_name / avatar_url / bio`（`id = auth.uid()`）；**`role / email / account_status / roster_ref` 由 BEFORE UPDATE 触发器锁死——非 admin 改这些抛异常**（吸收 rls 评审 high：这是整套权限最致命的单点，不能只靠 RLS 行级策略，否则学生可 `update profiles set role='admin'` 自提管理员）。推荐实现：撤销普通角色对 `profiles` 的直接 UPDATE 权，只暴露一个受限 RPC（`SECURITY DEFINER`，仅允许改 `display_name/avatar_url/bio`）；或保留直接 UPDATE 但用触发器 `if NEW.role is distinct from OLD.role and not is_admin() then raise exception`（对 email/account_status/roster_ref 同样处理）。
- **delete**：仅 `is_admin()`；普通退社走 `account_status='suspended'`，保留历史 author 关联。

**验收负样本（进 CI）：** student 直接 `update profiles set role='admin' where id=auth.uid()` 必须被数据库拒绝。

---

### 3.2 Term（学期，几乎只读）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK default gen_random_uuid() |
| `name` | text | not null，如「2026 春季」 |
| `starts_on` | date | not null |
| `ends_on` | date | not null，`check (ends_on >= starts_on)` |
| `is_active` | boolean | not null default false |

不变量：同一时刻至多一个 `is_active = true`（`create unique index on "Term"(is_active) where is_active`）。首页「第 N 周」由 active term 推算（时区 Asia/Shanghai）。

**RLS：** select 所有登录成员可读；insert/update/delete 仅 `is_admin()`。

---

### 3.3 Course（课程，实体永驻）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `term_id` | uuid | FK → Term，not null |
| `name` | text | not null |
| `short_name` | text | 可空，头像栏/卡片/花名册分课用 |
| `avatar_url` | text | 可空；课程头像 |
| `description` | text | 可空，课程主页简介 |
| `owner_id` | uuid | FK → User，not null；默认建课人 |
| `created_at` | timestamptz | not null default now() |

**RLS：** select 所有登录成员可读（头像栏要列全部课程）；insert 仅 `is_admin()`；update `is_admin()` 或 `course_role(id) in ('teacher','assistant')`；delete 仅 `is_admin()`（建议软停用，首切片可只给 admin 物理删、不暴露前端）。

---

### 3.4 CourseMembership（选课/任课关系，自我提权防护——吸收 rls 评审 high）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `course_id` | uuid | FK → Course，not null |
| `user_id` | uuid | FK → User，not null |
| `role` | text | not null，`check (role in ('member','teacher','assistant'))`，默认 `'member'` |
| `created_at` | timestamptz | not null default now() |
| PK | — | `primary key (course_id, user_id)` |

**RLS：**
- **select**：所有登录成员可读。
- **insert / update / delete**：仅 `is_admin()` 或**该课现有的 `teacher`**（`course_role(course_id) = 'teacher'`）。**明确：管理成员仅限 course teacher 或 admin，`assistant` 不可改 membership**（不要复用 `can_post_course` 来守 membership，否则 assistant 能自提 teacher 或踢人）。
- **防 upsert 绕过**：insert 与 update 拆成独立策略，避免用一条宽松策略让 member 借 `insert ... on conflict do update` 改自己 role。`course_id / user_id` 由触发器冻结，`role` 合法性在 `with check` 校验。
- **防孤儿课程**：触发器或约束防止课程**最后一名 teacher** 被降级/删除（否则课程失主、无人能管）。

**验收负样本：** assistant 把自己升 teacher、member 用 upsert 改自己 role、降级课程唯一 teacher——均须被拒。

---

### 3.5 ScheduleSlot（官方课表时段，只读层）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `term_id` | uuid | FK → Term，not null |
| `course_id` | uuid | FK → Course，可空（`slot_kind='free'` 留白时段可无课） |
| `weekday` | smallint | not null，`check (weekday between 1 and 7)`（1=周一） |
| `starts_at` | time | not null |
| `ends_at` | time | not null，`check (ends_at > starts_at)` |
| `slot_kind` | text | not null，`check (slot_kind in ('required','large_elective','small_elective','free'))` |

选修：首切片只显示「大选修/小选修」标签，姓名→课程映射放后面，本表不挂学生个人维度。

**RLS：** select 所有登录成员可读；insert/update/delete 仅 `is_admin()`。**教师调课不在这里改，走 §3.6**——任何「今天临时变了」不允许 `UPDATE ScheduleSlot`。

---

### 3.6 ScheduleChange（调课，追加不覆写）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `slot_id` | uuid | FK → ScheduleSlot，not null（始终指向原时段，入口不丢） |
| `occurs_on` | date | not null（哪一天的这节课变了） |
| `change_type` | text | not null，`check (change_type in ('location','time','cancelled','note'))` |
| `message` | text | not null（直接喂横幅） |
| `new_location` | text | 可空，`change_type='location'` 时填 |
| `new_starts_at` | time | 可空，`change_type='time'` 时填 |
| `new_ends_at` | time | 可空，`change_type='time'` 时填 |
| `published_by` | uuid | FK → User，not null（= `auth.uid()`，服务端写） |
| `published_at` | timestamptz | not null default now() |
| `deleted_at` | timestamptz | 可空，软删除（撤回） |

**派生渲染规则（与 §2.3 统一）：** 前端把 `(slot_id, occurs_on)` 上**最新未软删**的 ScheduleChange 叠加到课表卡片（标红/横幅）；软删后卡片**恢复原状**。原 ScheduleSlot 永不变。

**RLS：**
- **select**：所有登录成员可读 `deleted_at is null` 行。
- **insert**：`can_post_course(slot.course_id)` 且 `published_by = auth.uid()`：
  ```sql
  with check (
    published_by = auth.uid()
    and exists (select 1 from public."ScheduleSlot" s
                where s.id = slot_id and can_post_course(s.course_id))
  )
  ```
  `slot_kind='free'`（course_id null）天然被 `can_post_course(null)=false` 挡住。
- **update**：`using (published_by = auth.uid() or is_admin())`；触发器锁死除 `deleted_at` 外所有列（实现「只能撤回不能改写」）。**同课多 teacher 不能互改对方已发布的调课**（防社工钓鱼横幅），更正一律发新行。
- **delete**：不开放物理删（保留痕迹），仅 admin 兜底。

**验收负样本：** teacher 篡改另一 teacher 的调课 `message` 必须被拒。

---

### 3.7 Post（课程动态）

> **多态枚举收口（吸收 scope 评审 medium）：** 首切片只有 `course` 一种空间真实存在。`space_type` 的 check 约束本切片**只放 `'course'` 一种**（不预先硬编码尚未设计的 `project/community`，避免为未确认形态下注、未来改枚举要写 migration）。`project/community` 等后续空间由那些模块开工时再扩约束。

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `space_type` | text | not null，`check (space_type in ('course'))`（后续切片再扩） |
| `space_id` | uuid | not null（`space_type='course'` 时 = `Course.id`） |
| `title` | text | not null（纯文字帖也要标题，瀑布流封面=写标题的图） |
| `body_markdown` | text | 可空（正文 Markdown；本切片正文内不内联图，图走 PostAsset） |
| `author_id` | uuid | FK → User，not null，= `auth.uid()` |
| `status` | text | not null，`check (status in ('draft','published'))`，默认 `'draft'` |
| `published_at` | timestamptz | 可空；由触发器据 status 维护（见 §3.0） |
| `created_at` | timestamptz | not null default now() |
| `updated_at` | timestamptz | not null default now()（触发器维护） |
| `deleted_at` | timestamptz | 可空，软删除 |

排序：动态流按 `published_at desc`（已发布帖必有 published_at）。课程头像栏「有更新靠前」用该课最新已发布 Post 的 `published_at`。

**RLS（本切片只覆盖 course 空间）：**
- **select**：复用 `post_is_readable(id)` 的等价条件（已显式 `space_type='course'` + `deleted_at is null` + 草稿收口）：
  ```sql
  using (
    deleted_at is null and space_type = 'course' and (
      status = 'published'
      or author_id = auth.uid()
      or can_post_course(space_id)
    )
  )
  ```
- **insert**：仅课程负责人/admin：
  ```sql
  with check (
    space_type = 'course'
    and author_id = auth.uid()
    and can_post_course(space_id)
  )
  ```
  普通 member **无任何策略放行写 Post**（自由发帖 v2）。
- **update**：`using (deleted_at is null and (author_id = auth.uid() or can_post_course(space_id)))`；`with check (space_type='course' and can_post_course(space_id))`；**`space_type / space_id / author_id / created_at` 由触发器冻结**（防跨课搬帖、防改 author_id 冒名——吸收 rls 评审 high）；软删走 update 置 `deleted_at`。
- **delete**：不开放物理删给前端（软删）；仅 admin 兜底。

---

### 3.8 PostAsset（帖子图片，首切片只做 image）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `post_id` | uuid | FK → Post (`on delete cascade`)，not null |
| `storage_key` | text | not null（Supabase Storage 路径） |
| `asset_type` | text | not null，`check (asset_type in ('image','pdf','document','spreadsheet','link'))`；**本切片应用层 + seed 只用 `image`** |
| `sort_order` | int | not null default 0（多图横滑顺序） |
| `created_at` | timestamptz | not null default now() |
| `deleted_at` | timestamptz | 可空，软删除 |

> **单一作者声明（吸收 handoff 评审 medium）：** handoff §2.5 设想的「素材池 / 多人上传 + 指定人策展封面 + 编辑权分离」是 **v2**；v1 锁定单一发布者，故 PostAsset 单属主、Post 单 author_id。「详情页作者只放头像不放名字」是为 **v2 多编辑者预留**的设计，v1 先这么呈现。

**RLS：**
- **select**：复用 `post_is_readable(post_id)`（统一用一个函数，避免 exists 子查询的 RLS 语义不确定性——吸收 rls 评审 medium），且本行 `deleted_at is null`：
  ```sql
  using (deleted_at is null and post_is_readable(post_id))
  ```
- **insert / update / delete（软删）**：仅对该 `post_id` 有写权（作者本人或 `can_post_course(post.space_id)`），且 `asset_type = 'image'`：
  ```sql
  with check (
    asset_type = 'image'
    and exists (select 1 from public."Post" p
                where p.id = post_id
                  and (p.author_id = auth.uid() or can_post_course(p.space_id)))
  )
  ```
- 物理 delete 不开放前端；`on delete cascade` 仅在 admin 物理删 Post 时连带清 PostAsset **行**。

> **Storage 文件清理（吸收 rls 评审 medium）：** `on delete cascade` 删的是 DB 行，**删不掉 Storage 里的图片对象**。物理删 Post 时需有服务端流程同步删 Storage 对象，否则产生孤儿文件且可能仍可直链。本切片因不做上传 UI，物理删极少，但 admin 删帖脚本须包含「连带删 Storage」步骤。

**验收负样本：** 草稿帖的 PostAsset 行对学生 select 返回 0 行。

---

### 3.9 Comment（评论，独立栏，不写入正文，全员可评）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | uuid | PK |
| `post_id` | uuid | FK → Post (`on delete cascade`)，not null |
| `author_id` | uuid | FK → User，not null，= `auth.uid()` |
| `body` | text | not null（纯文本/轻 Markdown，无图） |
| `created_at` | timestamptz | not null default now() |
| `deleted_at` | timestamptz | 可空，软删除 |

**RLS：**
- **select**：`post_is_readable(post_id)` 且本行 `deleted_at is null`。草稿帖的评论跟随草稿可见性。
- **insert**：任一登录成员，只要该 Post 对他可见，且 `author_id = auth.uid()`：
  ```sql
  with check (author_id = auth.uid() and post_is_readable(post_id))
  ```
  门槛是「看得见这帖」，不是「是不是负责人」——实现「老师发帖、全员评论」。
- **update**：`using (author_id = auth.uid())`；**`post_id / author_id / created_at` 由触发器冻结**（吸收 rls 评审 high：否则攻击者可把自己评论 UPDATE 成 `post_id=任意目标帖` 嫁接钓鱼内容）；admin 可软删他人评论（管理）。
- **delete**：不开放物理删（软删）；作者本人或 admin 可软删；仅 admin 兜底物理删。

**验收负样本：** 用户尝试把自己评论的 `post_id` 改成别的帖必须被拒；软删一条评论后普通成员 select 该帖评论少一条。

---

### 3.10 Storage 对象的 RLS（吸收 rls 评审 high，关键补强）

> 评审指出：§4.4 只说了「前端怎么拿 signed URL」，不是 Storage 层访问控制。Supabase Storage 对象访问由 `storage.objects` 上的 RLS 决定。若 storage policy 只判断「登录即可」，草稿帖图片就会被任意成员直链拿到，绕过 §3.7/3.8 的草稿收口；且 `storage_key`（`posts/{postId}/{uuid}.jpg`）可枚举/可猜。

**必做：**
- bucket `post-assets` 设为 **private（非公开）**。
- `storage.objects` 上写 RLS：
  - **SELECT policy**：从对象 path 解析出 `postId`，复用 `post_is_readable(postId)` 判定（草稿仅作者/负责人/admin 可读）。
  - **INSERT/UPDATE/DELETE policy**：要求 `can_post_course(该 post 的 course)`（本切片无上传 UI，写主要走 admin/seed，但策略仍要设）。
- 即使走 service-role 在 Server Action 里生成 signed URL，也**必须先跑一遍 `post_is_readable` 再签发**——不能因为「前端不展示」就认为安全。

**验收负样本：** 学生用 anon key 直接请求他人草稿帖图片的 signed URL / download 必须被拒。

---

### 3.11 产品不变量汇总（实现者验收清单）

1. **调课不覆写**：调课只产生 `ScheduleChange` 行，`Course`/`ScheduleSlot` 不被改写；`cancelled` 也不删 slot/course，入口恒在。
2. **课程实体永驻**：Course/ScheduleSlot 公共只读层，普通成员无写权；首页课表卡片永远能点进课程。
3. **发帖权限来自课程角色**：能发 Post / ScheduleChange 的是该课 `teacher|assistant`（或 admin），不是全局 `User.role='teacher'` 的任意人。
4. **全员可评、不可越权发帖**：登录成员对可见已发布帖都能评论；无任何策略放行普通 member 写 Post。
5. **草稿可见性收口**：`draft` 帖及其附件、评论仅对作者 + 该课负责人 + admin 可见；`published` 才全员可读。
6. **author_id 不可伪造/不可篡改**：内容表 `author_id`/`published_by` 由服务端 `auth.uid()` 写入，触发器禁止改它。
7. **软删除而非物理删**：Post/PostAsset/Comment/ScheduleChange 删除走 `deleted_at`，RLS 默认过滤；物理删仅 admin 兜底。
8. **附件/评论继承父帖可见性**：PostAsset/Comment 可读性 = `post_is_readable(post_id)`，草稿帖的图与评论不泄露；Storage 对象同样受 `post_is_readable` 约束。
9. **角色不能自我提升**：非 admin 改不动 `User.role`（触发器/受限 RPC 兜底）；非课程 teacher 改不动 `CourseMembership.role`；assistant 不能管 membership；课程唯一 teacher 不能被自我降级。
10. **未登录读不到任何业务数据**：`auth.uid()` 为 null 时所有策略不放行。
11. **不可变列触发器锁**：所有内容表的「不该改的列」由 BEFORE UPDATE 触发器冻结，不只靠 RLS 描述。
12. **SECURITY DEFINER 函数加固**：固定 `search_path`、表名 schema 全限定、execute 仅授 authenticated。

> **诚实声明：** 以上为**设计规格**，尚未在仓库落地为 Supabase migration（当前仓库仍是零构建静态原型）。`post_is_readable()`、列级 role 防改触发器、Storage RLS、不可变列锁属实现细节，落地时需配套写 migration + 用两个测试账号验证四条核心路径（老师能发[或 seed 灌入]、学生只能评、学生看不到草稿、调课不改原课表）+ 跑全部「验收负样本」，方可视为通过。

---

## 4. 技术架构

> 给实现者和一群 vibe-coder 的「怎么搭、边界在哪、什么不能碰」。基于已锁技术栈（见 §1.2 的前提声明）与现有静态原型。诚实声明：以下是本切片要落地的目标结构，不是「已经跑起来的代码」；示例文件名是约定。

### 4.0 一句话心智模型

- **页面骨架和取数 = 服务端的事**（Server Component + Supabase 服务端客户端）。
- **点击/横滑/筛选/展开/表单 = 浏览器的事**（Client Component + Supabase 浏览器客户端）。
- **权限 = 数据库的事**（RLS），前端藏不藏按钮都不算数。
- **图片 = Storage 的事**，数据库只存指向图片的 key。

### 4.1 目录结构（Next.js App Router）

每个 vibe-coder 认领一个空间，尽量只在自己目录里写文件，不改别人的 `page.tsx` 和 CSS Module。

```text
haoqi-online/                      # Next 工程（仓库根，见 §6）
├─ app/
│  ├─ layout.tsx                   # 根布局：字体、全局 token、外壳
│  ├─ globals.css                  # 全局 token + reset（从 styles.css :root 搬）
│  ├─ (auth)/
│  │  ├─ login/page.tsx            # magic link 入口（全状态见 §5.7）
│  │  └─ auth/callback/route.ts    # 回调，交换 session（失败 redirect 带 error，见 §5）
│  ├─ (shell)/                     # 共享侧栏+顶栏的登录后区
│  │  ├─ layout.tsx                # Sidebar + Topbar + <main>
│  │  ├─ page.tsx                  # 首页(此刻)（真数据）
│  │  ├─ courses/
│  │  │  ├─ page.tsx               # 课程列表
│  │  │  └─ [courseId]/
│  │  │     ├─ page.tsx            # 课程主页
│  │  │     └─ posts/[postId]/page.tsx  # 动态详情
│  │  └─ (placeholders)/           # 5 个诚实占位空间
│  │     ├─ my-week/page.tsx       # 我的一周（纯占位，命名统一为 my-week）
│  │     ├─ credits/page.tsx       # 信用积分（占位）
│  │     ├─ reading/page.tsx       # 阅读联赛（占位）
│  │     ├─ projects/page.tsx      # 做事空间（占位）
│  │     └─ community/page.tsx     # 大家在干嘛（占位）
│  └─ api/                         # 仅放必须服务端跑的接口；优先用 Server Action
├─ components/
│  ├─ shell/                       # Sidebar / Topbar / MobileMenu（从原型移植）
│  ├─ ui/                          # Avatar / Panel / Chip / StateBlock(六态)
│  └─ post/                        # PostCard / PostFeed / CommentList
├─ lib/
│  ├─ supabase/
│  │  ├─ server.ts                 # 服务端客户端
│  │  ├─ client.ts                 # 浏览器客户端
│  │  └─ admin.ts                  # service-role（顶部 import 'server-only'，见 §4.3）
│  ├─ auth.ts                      # 取当前用户 + 角色封装
│  ├─ queries/                     # 取数函数集中地：getTodaySchedule()、getCourseFeed() 等
│  └─ types.ts                     # Supabase 生成的 DB 类型 + 业务别名
├─ middleware.ts                   # 刷新 session、保护需登录路由
└─ supabase/                       # migration SQL + RLS policy + seed
```

> **「我的一周」归属统一（吸收 scope 评审 medium）：** 三处不一致已统一为：**纯占位**，路由 `(placeholders)/my-week/page.tsx`，官方课表只在首页「今天的课」呈现。不做 week-table 视觉移植（延后到 v2 的个人视图）。

**新手约定：** 加页面 = 在自己空间目录加 `page.tsx`（路由自动生成）；只本空间用的组件放该空间旁的 `_components/`，跨空间放 `components/`；**取数逻辑统一写成 `lib/queries/*.ts`，页面只调用**（调课规则、权限过滤集中可审）。

### 4.2 Server Component 取数 vs Client Component 交互

App Router 组件默认 Server Component（SC）；文件顶部写 `"use client"` 才是 Client Component（CC）。

**默认 SC 负责：** 直接 `await` 取数（用 `server.ts`）、读当前用户和角色、渲染已发布内容/骨架/课程头像栏/Markdown 正文。取数全在服务端跑，密钥不下发浏览器。

**仅「浏览器里发生的事」升级 CC：** 头像栏横滑、动态流筛选 chip、图片组横滑、模态/侧栏开合、评论输入框等带 `useState/onClick/onChange` 的。

**边界手法：**
- 服务端取数 → 当 props 传给 CC 交互壳（CC 只按选中 chip 过滤已取数据，不重新发请求）。
- 能不 `"use client"` 就不写，交互收敛到最小叶子组件，不在顶层页面写 `"use client"`。
- **写真实数据用 Server Action**（`"use server"`），不在 CC 手搓 `fetch('/api/...')`。评论提交走 Server Action，服务端校验权限再写库。
- **写操作三态**（`useFormStatus`/`useTransition`）+ session 过期兜底（见 §2.2.6），失败显示错误、不假装成功。

### 4.3 Supabase 三种客户端：用法与安全（机器化卡点，吸收 rls 评审 low）

| 客户端 | 文件 | 用在哪 | key | 受 RLS | 铁律 |
| --- | --- | --- | --- | --- | --- |
| 浏览器 | `lib/supabase/client.ts` | CC | `anon` | 是 | 只读公开/自己有权数据；写走 Server Action |
| 服务端 | `lib/supabase/server.ts` | SC / Server Action / Route Handler | `anon` + 用户 cookie | 是（当前用户身份） | 默认全用它取数，RLS 自动兜底 |
| service-role | `lib/supabase/admin.ts` | 极少数服务端管理操作 | `service_role`（绕过 RLS） | 否 | **永远只在服务端**；禁止 import 进任何 CC；禁止下发浏览器 |

**安全红线：**
- `service_role` key 只能出现在 `admin.ts`，且 **`admin.ts` 顶部加 `import 'server-only'`**（被 client 引用时构建期报错）；**ESLint `no-restricted-imports` 禁止非 server-only 文件 import `lib/supabase/admin`**；**CI grep**：`service_role` 出现在 `NEXT_PUBLIC_` 或 client bundle 即 fail。把口头纪律变成构建期失败。
- 环境变量命名即权限边界：`NEXT_PUBLIC_` 前缀会下发浏览器（只放 Supabase URL + `anon` key）；`SUPABASE_SERVICE_ROLE_KEY` **绝不**加 `NEXT_PUBLIC_`；密钥配在 Vercel 环境变量，不进 git。
- **默认不用 admin 客户端**（95% 取数/写入用 `server.ts` 让 RLS 判权）；只有「花名册预置」「跨用户管理」这种确需越权场景才用 admin，且先想清为何 RLS 不够。
- 前端隐藏按钮 ≠ 权限；中间件 `middleware.ts` 刷新 session、挡未登录，是「体验层」，数据安全仍靠 RLS。

### 4.4 Storage 存动态图片方案（本切片只做读图，吸收 scope 评审 high）

> **范围收敛：** 首切片不做发帖编辑器（§1.5），故**没有「上传」动作**。完整上传链路（上传 Server Action、上传三态、服务端文件校验）**延后到 v2 发帖功能**。本切片只做**读图**。

- bucket `post-assets` 非公开；`PostAsset` 表只存 `storage_key / asset_type / sort_order`，图片不进数据库。图片文件由管理员手动放进 bucket（seed 阶段）。
- **读图：** Server Component 取数时，为**已发布且当前用户可读**的 Post 的图生成短时效 **signed URL** 给前端横滑展示。生成前必须跑 `post_is_readable`（§3.10），草稿图不泄露。
- Storage 对象的 RLS 见 §3.10（必做，不能只靠前端不展示）。
- 诚实声明：本切片 `asset_type` 实际只 `image`；PDF/文档/表格/外链是 OUT，界面不放假入口。

### 4.5 设计系统移植策略（全局 token + 按组件 CSS Module）

核心原则：**搬运，不重做。** 不引任何组件库（不上 MUI/Antd/Chakra/shadcn 抹平手工感），不换视觉方向。

1. **全局层 = 设计 token + reset，放 `app/globals.css`，根 `layout.tsx` 引一次。** 把 `styles.css` 的 `:root` 整块搬过来：`--ink/--navy/--paper/--white/--line/--yellow/--lemon/--blue/--coral/--mint/--pink/--radius` 等语义变量原样保留，**不改色值、不改语义**（黄=好奇/积分/阅读、珊瑚=变更/行动、薄荷=完成/协作…）。全局只放颜色/圆角/字体变量、`box-sizing`、`body`、`button/a` 基础。
2. **组件层 = 每组件一个 CSS Module（`X.module.css`），局部作用域。** 颜色一律引用全局变量，不写死十六进制。原型 `.feed-item / .course-chip / .panel / .class-row` 等按组件拆进各自 module，保留圆角/轻阴影/不规则形状（`.score-card` 的 `rotate(-1deg)`、`.weather-orb` 不规则 border-radius、`.brand-mark` 旋转）。**不为「统一」磨平手工感。**

**迁移顺序：** ① 全局 token + 外壳（Sidebar/Topbar），对照原型截图确认无差异；② 首页（先静态数据验证视觉，再接真数据）；③ 课程空间三页；占位 5 空间直接放「建设中」诚实占位组件。

**vibe-coder 约定：** 改颜色 = 改全局变量；自己组件样式写自己的 module，不往 `globals.css` 堆模块样式（原型 `modules.css` 无限膨胀是反例）；窄屏不溢出、交互可聚焦、图标钮有 `aria-label`（移植时别丢）。

### 4.6 给 vibe-coder 的范式与模块边界（40 人并行不打架）

**模块边界（认领制）：** 每个空间 = `app/(shell)/你的空间/` 一个目录 + 旁边 `_components/`。**不要改的公共区**：`app/layout.tsx`、`app/globals.css`、`components/shell/`、`lib/supabase/`、`supabase/`（migration 与 RLS）——要改先开 issue 由对应负责人改。数据模型名全社区统一，从 `lib/types.ts` 引。

**写新页面标准套路：** ① 建 `page.tsx`（默认 SC）；② 需数据调 `lib/queries/`；③ 处理六态（`loading.tsx`/Suspense、空态文案、`error.tsx`、no-permission、draft、published），用 `components/ui/` 统一状态块，**不触发的态显式标 N/A 不白做**；④ 交互抽最小 CC 叶子；⑤ 写数据走 Server Action，服务端校验 + 三态。

**诚实纪律（不可破，含反例清单）：** 没接后端的界面必须标「建设中/尚未接后端」，不放假按钮。反例（吸收 states 评审 high）：① 单一动作不要用「···（更多）」图标暗示有多项操作，改成明确「→ 查看课程」；② 空时段 `＋` 钮做禁用态，不弹承诺性气泡；③ 顶栏搜索/通知做禁用态、去掉假红点。mock 数据集中放、明确命名（`lib/queries/_mock.ts`），接真数据时整块替换，不漏进生产。

**最小质量门槛（进 CI）：** `tsc --noEmit` 严格模式必过（DB 类型由 Supabase 生成，不手写）；`service_role`/非 `NEXT_PUBLIC_` 密钥不得进客户端（构建期硬卡点，见 §4.3）；移动端（≤720px）侧栏可展开、内容不横向溢出（看板/宽表局部横滚）。

---

## 5. 登录、角色与花名册预置

> 范围严格限定在「让约 40 名学生 + 若干老师登录、拿正确角色、看正确内容」。所有写真实数据的能力（积分、签到等）不在本节。
> 诚实声明：本节是**待实现方案**，现有原型（`index.html` 写死的「David · 学生 · 三年级」）无真实登录。落地前侧栏头像区须显式标注「未登录 / 演示身份」，不得让示例身份冒充已登录态。

### 5.1 为什么是「邮箱魔法链接 + 邀请制」

已锁决策：Supabase 邮箱 magic link 邀请制，账号花名册预置。
- **邀请制**：封闭社区不开放自助注册。陌生邮箱点登录应得「这个邮箱不在名单里」而非「给你建了个新账号」。
- **魔法链接（无密码）**：学生不必记新密码，降低门槛；不存明文/弱口令。
- **已知顾虑**：国内邮箱收 magic link 可能延迟/进垃圾箱/被企业邮拦截。真实风险，降级备选见 §5.7，须随首版准备好可切换，但首版默认仍走 magic link。

### 5.2 数据结构：auth.users + roster + profiles（权威字段表，解决 id 回填竞态）

> **吸收 states + scope 评审 high（id/FK 冲突 + email 匹配竞态）：** 原「先插 profiles 占位行、用花名册临时键」与「`profiles.id` 是 references `auth.users` 的 PK」物理冲突——预置时 `auth.users` 行还不存在，FK 插不进。**本切片采用「独立 roster 表」方案（评审推荐 A）：花名册存独立 `roster` 表，登录时触发器据 email 建 profile，`profiles.id` 永远 = 真实 `auth.users.id`，FK 不冲突。**

Supabase 自带 `auth.users`（凭证、邮箱、最近登录），**不往里写业务字段**。

**`public.roster`（花名册名单，email 为键，profile 之前就存在）：**

```text
public.roster
  email              text  PK            -- 统一 lower(trim()) 存储
  display_name       text  not null
  role               text  check (role in ('student','teacher','admin')) default 'student'
  roster_ref         text                -- 花名册原始行（学号/姓名键），对账用
  course_short_names text[]              -- 该人要加入的课程简称
  course_role        text  check (course_role in ('member','teacher','assistant')) default 'member'
  invited_at         timestamptz
  created_at         timestamptz default now()
```

**`public.profiles`（= 数据模型 User，唯一权威字段表）：**

```text
public.profiles
  id              uuid  PK references auth.users(id) on delete cascade  -- 登录后才有，= 真实 auth id
  email           text  unique           -- 冗余便于对账；与 Auth 邮箱一致，登录认 Auth
  display_name    text  not null
  avatar_url      text                    -- 空时前端用名字首字渲染色块
  role            text  check (role in ('student','teacher','admin')) default 'student'
  account_status  text  check (account_status in ('invited','active','suspended')) default 'invited'
  bio             text                    -- 个性签名（独立字段，≠ account_status）
  roster_ref      text                    -- 来自 roster，对账用
  created_at      timestamptz default now()
  updated_at      timestamptz default now()
```

> **字段冲突已消除（吸收 handoff + scope 评审 medium）：** 旧草稿里 `profile_status` 一处当 bio、一处当状态机，已拆为 `account_status`（枚举）+ `bio`（文本）两个独立字段；`roster_name` 统一为 `roster_ref`。本表是**唯一权威**，§3.1 只引用并补 RLS。

- 一对一：一个 `auth.users` 行 ↔ 一个 `profiles` 行，`profiles.id = auth.users.id`。
- profile 不是凭证表，凭证永远在 `auth.users`；代码读身份一律读 `profiles`（带 role），不读 `auth.users` 私有字段。

### 5.3 流程：邀请 → 首次登录 → 据 roster 建 profile → 角色就位

**关键：角色在 roster 阶段就定好，登录只是「据名单认领身份」，不依赖用户自填，也不会出现「登录后无角色空壳」。**

1. 管理员从花名册批量 upsert `roster` 行（email `lower(trim())`、display_name、role、roster_ref、course_short_names、course_role）。
2. 对每个 roster email 调 Supabase Admin `inviteUserByEmail`（后台脚本/Auth Admin API），Supabase 在 `auth.users` 建用户并发邀请/魔法链接邮件。
3. **触发器 `on auth.users insert`**：按 `lower(trim(email))` 在 `roster` 里查到对应行 → 建 `profiles` 行（`id = NEW.id`、回填 role/display_name/roster_ref、`account_status='invited'`）。**`profiles.id` 永远 = 真实 auth id，FK 不冲突。** roster 查不到该 email → **不建 profile**，记一条待人工处理日志（绝不自动放行陌生人）。
4. 用户点链接 → Supabase 验证 → 浏览器拿 session。
5. 首次加载检查 `account_status`：若 `invited`，引导极简「确认资料」页（确认昵称/上传头像，**角色只读展示，不让用户自己改**），确认后置 `active`。
6. 之后每次登录验证通过即恢复 session，直接进首页。

**异常分支（每条都要有界面，不静默失败——吸收 states 评审 high）：**
- 邮箱不在 roster → 登录页提示「这个邮箱不在好奇名单里，找管理员加你」，不创建账号。
- **auth 用户存在但无 profile**（email 大小写/空格不一致导致触发器没匹配上）→ 拦在应用入口显示「账号正在开通 / 邮箱与名单不一致，联系管理员」，**不放进任何业务页**（吸收 states 评审 medium）。email 匹配统一 `lower(trim())` 已尽量降低此情况。
- 链接过期 → 「链接失效了，重新发一封」+「重新发送」（带冷却）。
- **链接已被使用**（用户回邮箱再点一次，或邮箱客户端预取链接消费了 token）→ 专门文案「这条链接已经用过了」区分于「过期」（吸收 states 评审 high）。
- **跨设备点开**（A 设备请求、B 设备打开，PKCE/同源失败）→ 提示「请在请求链接的同一浏览器打开，或重新发送」。
- **callback 出错**（state 不匹配/URL 被改写）→ `auth/callback/route.ts` 失败时 **redirect 到带 `?error=` 的 `/login`**（而非抛 500/白屏），显示兜底文案 + 重试 + 联系管理员。
- `account_status='suspended'` → 验证可过但应用层拒绝，显示「账号已被停用」+ 联系方式。

### 5.4 三角色能力差异（首切片范围内）

角色存 `profiles.role`（粗粒度全局）；课程内细粒度由 `CourseMembership.role` 决定，两者叠加。**全局 teacher ≠ 每门课都是老师。**

| 能力（首切片范围内） | student | teacher | admin |
| --- | --- | --- | --- |
| 邮箱魔法链接登录 | ✓ | ✓ | ✓ |
| 读所有课程「已发布」Post / 课表 / 调课 | ✓ | ✓ | ✓ |
| 在「本人负责的课」发 Post* | ✗ | ✓（限本人 CourseMembership=teacher/assistant 的课） | ✓（任意课，运维兜底） |
| 评论已发布 Post | ✓ | ✓ | ✓ |
| 发布调课 ScheduleChange | ✗ | ✓（限本人负责课） | ✓ |
| 看他人草稿 Post | ✗ | 仅同课程负责人可见 | ✓ |
| 管理花名册 / 邀请 / 改他人 role | ✗ | ✗ | ✓ |
| 指派课程负责人（建 CourseMembership） | ✗ | ✗ | ✓ |

> *诚实交代：本切片**不做发帖编辑器 UI**（§1.5），上表「发 Post」的能力在首切片通过 **seed/管理员后台**体现，发帖 UI 延后 v2。RLS 写策略仍按上表配好（为 v2 发帖 UI 铺路、也兜底 admin 脚本）。
- 首切片**明确不做**的角色能力（诚实占位，OUT）：学生自由发帖、多人协作编辑、积分/签到写操作、跨课程批量管理。UI 上要么不出现、要么标「v2」。
- **权限服务端兜底**：每个「✗」靠 RLS 实现，不靠前端藏按钮。

### 5.5 角色如何落到 RLS（实现指引）

- 用 `auth_role()` / `is_admin()` / `course_role()` / `can_post_course()` / `post_is_readable()`（定义与加固见 §3.0）。
- Post 读：`published` 全员可读；`draft` 仅作者 + 同课 teacher/assistant + admin（§3.7）。
- Post 写：`insert/update` 要求 `author_id = auth.uid()` 且 `can_post_course(space_id)`，或 admin（§3.7）。
- ScheduleChange 写：绑定课程负责人（§3.6）。
- profiles：可读全体 `display_name/avatar_url`；`role/email/account_status/roster_ref` 的写由触发器/受限 RPC 锁死仅 admin（§3.1）。
- **RLS 策略必须测负样本**（§3 各表已列）：student 发帖/改别人资料/自提 admin 必须被拒，进 CI。

### 5.6 从花名册批量预置账号与分课

目标：把现有「姓名 + 邮箱 + 班级/年级 + 选修标签」名单一键变成可登录账号 + 正确课程归属。

**输入 CSV（列名固定）：**
```text
email, display_name, role, roster_ref, course_short_names, course_role
liyuan@example.com, 林元, student, G3-017, "问题与方法;城市漫游", member
kiki@example.com,   Kiki, teacher, T-004,  "问题与方法",          teacher
```

**预置脚本步骤（幂等）：**
1. 读 CSV，校验：邮箱格式、role 合法、`course_short_names` 都能在 `Course` 查到（查不到→报错停下，不静默跳过）。email 统一 `lower(trim())`。
2. upsert `roster`（按 email 唯一），写 role/display_name/roster_ref/course_short_names/course_role。
3. 对每个邮箱调 `inviteUserByEmail`。已存在的 auth 用户跳过邀请，不重复发信。
4. 触发器在 auth.users 建出时据 roster 建/对齐 `profiles`（id = 真实 auth id）。
5. 登录后（或脚本对已登录用户）解析 `course_short_names`，对每门课 upsert `CourseMembership(course_id, user_id, role=course_role)`。
6. 输出对账报告：成功 N、邮箱不匹配课程 M（列出）、重复跳过 K——要能让管理员核对，不是跑完就算。

**幂等与安全：** 可重复跑，靠唯一约束 + upsert 不重复发邀请/不重复建成员关系。脚本需 service_role key，**只在受信任后台/本机跑，绝不进前端、绝不进仓库**（未经负责人确认不加生产密钥）。

**先有课程再分人：** 预置顺序 = 先建 Term/Course（首版可由 admin 用种子 SQL 手工录本学期课程），再跑花名册脚本分人。

**选修处理：** 首版 `ScheduleSlot.slot_kind` 只先区分 `large_elective / small_elective`；CSV 可先不填精确选修映射；姓名→具体选修课映射放后面再补一轮 `CourseMembership`。预置时不为「看起来完整」编造选修归属。

### 5.7 国内邮箱顾虑与降级备选（随首版准备，标注清楚）

最现实失败模式是「邮件到不了/到得慢」。三层应对，**首版默认第 1 层，第 2 层做到能一键切，第 3 层只占位**：

1. **默认：魔法链接。** 配套必做：配置自定义 SMTP 发信域（比默认更不易被国内邮件商拦）+ 登录页写清「可能进垃圾箱」；「重新发送」带冷却；链接有效期不要太短（给国内延迟留余量）；给管理员一个「手动复制某人一次性 magic link」后路（通过微信/当面发给收不到信的同学）——40 人小社区最务实兜底。
2. **降级备选（标「备选，未默认开启」）：管理员预设密码 / 邮箱+密码登录。** Supabase 原生支持；admin 给每人设初始密码（首次登录强制改密）。风险写明：初始密码分发有泄露风险（别群发）、学生易设弱密码，故兜底而非默认。
3. **未来项（仅占位，首版不做，不假装做了）：手机短信验证码。** 需国内短信服务商（成本/实名/备案/风控），超出首切片。登录页/文档诚实标「短信登录：规划中」，不放点了没反应的假按钮。

**登录页状态清单（吸收 states 评审 high，补齐 magic link 边界）：**
- `loading`：点「发送链接」后按钮转圈 + 禁用，「正在发送…」。
- `empty`：未输入邮箱时发送按钮禁用。
- `error`：邮箱不在名单 / 发送失败，各有明确文案 + 重试。
- `link-expired`：链接过期 → 重新发送。
- `link-consumed`：链接已使用 → 文案区分于过期，引导重新发送。
- `link-cross-device`：跨设备打开 → 「请在请求链接的同一浏览器打开，或重新发送」。
- `callback-error`：回调失败兜底页 + 重试 + 联系管理员（route 失败 redirect 带 error query，不抛 500）。
- `no-permission`：`suspended` 账号登录后被拒，显示停用说明 + 联系方式。
- `account-not-provisioned`：auth 用户存在但无 profile → 「账号正在开通 / 邮箱与名单不一致，联系管理员」。
- 成功：「链接已发到 xxx@…，去邮箱点开」+ 重新发送（带冷却）。
- 已登录再访问登录页 → 直接跳首页。

### 5.8 本节交付与验收

- 交付物：`roster` + `profiles` 表 + RLS 策略、`on auth.users insert` 据 roster 建 profile 的触发器、列级 role 防改触发器/受限 RPC、花名册预置脚本（CSV → roster + 邀请 + CourseMembership）、登录页（含全部状态）、首次登录「确认资料」页、「auth 有 / profile 无」入口拦截页。
- 验收（带负样本）：
  1. 花名册学生邮箱收到链接、点开是 `student`、看不到任何发帖入口；老师邮箱点开在本人负责课能发帖（或 seed 已灌入并可见为负责人）、别人的课不能。
  2. 不在花名册的陌生邮箱点登录，不被创建账号，得到明确拒绝。
  3. 用 student token 直接打 API 发帖 / 改他人 role / 自提 admin，被 RLS/触发器拒（前端藏不藏都拒）。
  4. 预置脚本重复跑两次，不重复发邀请、不重复建成员关系，对账报告一致。
  5. admin 后台改某人 role 和课程归属，改完该用户刷新后权限随之变化。
  6. email 大小写/空格不一致的边界：触发器仍按 `lower(trim())` 匹配上 roster；匹配不上时用户落到「账号正在开通」拦截页而非业务页。

---

## 6. 仓库结构 / Git 协作 / 部署 / 验收

> 本节是工程协作地基。约 40 名学生 + 老师会并行 vibe coding，所以这些纪律是给一群新手协作者看的。请逐条照做，不凭旧会话或习惯发挥。

### 6.0 第 0 步：仓库准备（一次性，吸收 scope 评审 low，独立前置）

> 这是一次性仓库整理动作（不是持续工程约定），独立一个 PR 先做，别和 Next 脚手架混在一起。

当前事实（已用 `git`/`ls` 核对）：远端 `origin = https://github.com/xing0325/haoqi-online-new.git`（默认 `main`，**远端名不改**）；本地副本 `C:/Users/david/haoqi-online`；原型 8 个文件仍在仓库根（`index.html / styles.css / modules.css / credits.css / interactions.css / app.js / README.md / HANDOFF_TO_CLAUDE.md`），`/legacy-prototype` 尚未创建。

迁移动作：
1. 新建 `legacy-prototype/`，用 `git mv` 把 6 个前端文件搬进去（保留历史）：`index.html / styles.css / modules.css / credits.css / interactions.css / app.js`。
2. `HANDOFF_TO_CLAUDE.md` 留仓库根（产品事实来源，所有人一眼可见）。
3. 根 `README.md` 改写：顶部说明「根目录是 Next 应用，`legacy-prototype/` 是只读设计参照，禁止在其上继续加功能」；旧 README 复制一份进 `legacy-prototype/README.md`。
4. `legacy-prototype/README.md` 写明：**这是设计参照（视觉/文案/token 的唯一权威来源）；可读、可照搬 token，但不在这里改 bug、不接后端、不当线上代码。**

> 铁律：`legacy-prototype/` 是「博物馆」。Next 应用的纸感视觉/语义色/卡片形状忠实对齐它，但任何人不许把新功能写进去。

### 6.1 目标仓库结构（Next 应用建在仓库根）

Vercel 默认 Root Directory = 仓库根。模块边界清晰、对新手友好。

```text
haoqi-online/                      ← 仓库根 = Next 应用根
├─ HANDOFF_TO_CLAUDE.md            ← 产品事实来源（留根）
├─ README.md                      ← 起跑步骤 + 协作纪律入口
├─ .env.example                   ← 所有环境变量（占位值，可提交）
├─ .env.local                     ← 真密钥（本地，git 忽略，绝不提交）
├─ .gitignore  next.config.ts  tsconfig.json  package.json
├─ middleware.ts                  ← Supabase session 刷新 / 路由保护
├─ legacy-prototype/              ← 旧静态原型，只读设计参照（含 README）
├─ docs/                          ← spec.md / domain-model.md / accept-checklist.md
├─ supabase/
│   ├─ migrations/                ← SQL 迁移（建表 + RLS + 触发器 + Storage policy）
│   └─ seed.sql                   ← 花名册 roster + 示例课程/课表 + 示例 Post(含 1 条草稿)
├─ public/                        ← 静态资源
└─ src/
    ├─ app/                       ← App Router（结构同 §4.1）
    ├─ components/  lib/  types/
```

> seed.sql 须含：Term/Course/ScheduleSlot、roster 名单、每门课若干 `published` Post + **至少 1 条 `draft` Post**、PostAsset（指向已放入 bucket 的图）、若干 ScheduleChange（含一条 cancelled）——支撑 §6.7 全部验收路径。

模块边界规则同 §4.6：一个空间一个目录；改 `layout.tsx / globals.css / lib/supabase/* / supabase/` 这类地基文件前先开 issue。数据模型名统一，从 `lib/types.ts` 引。

### 6.2 Git 协作纪律（issue → 分支 → PR）

1. **先拉再开工**：`git checkout main && git pull`。看到不属于自己的未提交改动就停下问清楚，绝不 `git reset --hard` 覆盖别人。
2. **先开 issue**：一任务一 issue，标题写清模块和范围。
3. **从 main 切分支**，按**功能/任务/日期**命名，**不按作者用户名**：`feat/course-feed-realdata`、`feat/home-today-schedule`、`chore/move-legacy-prototype`、`fix/narrow-nav-overflow`。
4. **小而完整的提交**：一条提交做一件能描述清的事。
5. **PR 必带 `Closes #编号`**：描述写明改了哪些文件、做了什么、**没做什么**（诚实标占位/未接后端）、怎么验证（截图/手测路径/`npm run build`）。
6. **审批后合并**，用 squash 保持 `main` 历史干净。
7. **禁止**：强推 `main`、`--no-verify` 跳钩子、并行改同一全局文件同一块、提交 `.env.local`/任何真密钥。

> 并行铁律：两个人不要同时改 `src/app/layout.tsx` 或 `globals.css` 同一段；地基类改动先合，功能分支再 rebase。

### 6.3 部署：Vercel + Supabase

**Supabase：** 一个云项目起步（建议至少给 `main` 一个独立 project，开发用本地或第二个 free project，避免脏数据污染线上）。建表 + RLS + 触发器 + Storage policy + 种子全部走 `supabase/migrations/` SQL 版本化提交，**不只在网页后台点鼠标改表**。RLS 必须开（成员可读所有「已发布」、草稿按 §3 规则、老师/admin 另算）。花名册预置见 §5.6。

**Vercel：** GitHub 直连。**Production 分支 = `main`**（合进自动发线上）。每个 PR 自动 **Preview 部署**，审批人点 PR 里 preview 链接看真效果——vibe coder 团队最省事的验收方式。Root Directory = 仓库根，框架自动识别 Next。

**环境变量/密钥：** `.env.example`（可提交，占位）列全变量：
```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # 仅服务端，绝不暴露浏览器，绝不带 NEXT_PUBLIC_ 前缀
```
`.env.local`（git 忽略）放真值。线上真值填 Vercel 环境变量（Production/Preview 分填），不写进代码、不发群里截图。`anon key` 可走 `NEXT_PUBLIC_`（安全靠 RLS 兜底）；`service_role key` 永远只在 server 端，一旦带 `NEXT_PUBLIC_` 立即在 Supabase 后台 rotate。机器化卡点见 §4.3。未经负责人确认不加任何收费/支付/第三方统计追踪脚本/额外认证供应商。

### 6.4 本地起跑（写进 README）

```powershell
git clone https://github.com/xing0325/haoqi-online-new.git
cd haoqi-online-new        # 本地副本目录名可能是 haoqi-online，以实际为准
npm install
Copy-Item .env.example .env.local   # 填入 Supabase URL + anon key（找负责人要）
npm run dev                 # 打开输出的 http://localhost:3000/
```
老原型不需构建，对照视觉直接浏览器打开 `legacy-prototype/index.html`。

### 6.5 质量门槛（合并前最低要求）

- `npm run build` 必过（类型/构建错误不许合并）；`npm run lint` 过（ESLint + TS）。
- 写真实数据的按钮有加载/成功/失败状态，不假装提交成功。
- 未接后端界面必须有「建设中/尚未接后端」标注，不假装能用。
- 窄屏不横向溢出；图标钮有 `aria-label`；交互可聚焦可点击。
- **`service_role`/非 `NEXT_PUBLIC_` 密钥不得进客户端**（构建期硬卡点，§4.3）。
- PR 至少带一条验证记录（构建结果/截图/手测路径）。

### 6.6 验收清单（首切片「算做完」的标准）

用**两个预置账号**端到端跑通：一个 `teacher`（课程负责人）、一个 `student`。在 Vercel Preview 或线上跑，不只本地。逐条勾选，任何一条做不到就不算完成，**不许用占位数据冒充通过**。

**A. 登录与身份**
- [ ] 花名册老师邮箱收到 magic link，点击登录成功，落首页「此刻」。
- [ ] 未登录访问受保护页（`/courses`）被挡回登录页，登录后回到原意图页面。
- [ ] 登录后读到角色（teacher/student），权限差异生效。
- [ ] 边界：链接已用过 / 跨设备打开 / 陌生邮箱 / suspended 账号 / auth有但profile无，各落到 §5.7 对应文案页，不白屏不500。

**B. 老师发帖 → 学生看见（核心闭环，按 §1.5 用 seed 预置）**
- [ ] 通过 seed/管理员后台预置一条 `published` Post（标题 + Markdown 正文 + 可选图片组）和一条 `draft` Post。
- [ ] 草稿 Post 学生看不到（RLS 兜底，不是前端藏）；老师在课程主页草稿区能看到自己草稿。
- [ ] 学生在**首页综合动态流**看到已发布动态；横滑课程头像筛选能筛到它。
- [ ] 学生进**课程列表** → 该课头像靠前并带新动态标记 → 进课程主页瀑布流看到它。
- [ ] 学生进**动态详情页**：顶栏=课程头像+名称、作者只放头像不放名字；图片组可横滑；Markdown 正文正确渲染。

**C. 评论**
- [ ] 学生在详情页评论区发一条 `Comment`，提交有加载态，成功后出现。
- [ ] 评论独立栏，**不写入正文**；刷新后仍在（真落库）。
- [ ] 失败时（断网）显示失败态、保留输入、不假装成功、不重复入库；双击不写两条。
- [ ] session 过期时发评论 → 提示「登录状态过期，重新登录后评论会保留」，草稿暂存，不静默吞。

**D. 调课（绝不替换课程实体）**
- [ ] 对某 `ScheduleSlot` 预置一条 `ScheduleChange`（改地点/时间/取消/备注），写入的是 `ScheduleChange`，**没有覆写 Course/ScheduleSlot**。
- [ ] 学生首页出现调课**横幅**；今天课表卡片**标红**。
- [ ] 标红课程**入口仍在**，点进课程主页正常。
- [ ] 横幅「知道了」按 `ScheduleChange.id` 记已读，刷新不无故重弹；撤回（软删）后卡片恢复原状。

**E. 诚实占位**
- [ ] 其余 5 个空间入口（信用积分/阅读/做事/大家在干嘛/我的一周）都在侧栏，点进去是明确「建设中」占位页，不假装能用。
- [ ] 首页积分卡/阅读卡是诚实占位，没把示例数字当真实数据。
- [ ] 首页「最近社区动态」是基于真 Post/Comment 的只读派生，无「N 人在线」等假数字。
- [ ] 顶栏搜索/通知钮禁用、无假红点；「＋发起一件事」不弹假提交表单。

**F. 视觉不回归**
- [ ] 桌面宽屏：侧栏+顶栏+纸感背景、海军蓝文字、黄/珊瑚/浅蓝/薄荷绿语义色，与 `legacy-prototype` 对齐，没换黑白/玻璃/赛博朋克或英文大 hero。
- [ ] 窄屏：导航可展开、内容不横向溢出、卡片没压坏。
- [ ] 不规则形状/手工感/卡片质感保留，没被臃肿组件库抹平。

**G. 路由与可恢复性**
- [ ] 前进/后退在首页 ↔ 课程列表 ↔ 课程主页 ↔ 动态详情间正确恢复，不白屏不串页。
- [ ] 深链可直达：粘贴 `/courses/[courseId]/posts/[postId]`（已登录）能恢复；未登录先登录再回该页。
- [ ] 刷新任意页状态不丢、不报错。

**H. 页面状态覆盖 + 可触发演示（吸收 states 评审 low）**
- [ ] 首页/课程列表/课程主页/动态详情各自处理 loading/empty/error/no-permission（不触发的态显式标 N/A）。
- [ ] **可控触发手段**：用测试账号 + 一条他人草稿 Post 的深链验 no-permission（须走无权限页，不是白屏）；用 DevTools offline 或一个会 500 的测试路由验 error 态——确保这两态不是只写不验的死代码。

**I. 安全负样本（吸收 rls 评审，进 CI）**
- [ ] student `update profiles set role='admin'` 被拒。
- [ ] student/member 发 Post、改他人 role、assistant 自提 teacher、用户改自己评论 `post_id`、teacher 篡改他人调课 message——均被拒。
- [ ] 学生用 anon key 直接请求他人草稿帖图片 signed URL 被拒。

---

相关文件（绝对路径）：
- 产品事实来源：`C:/Users/david/haoqi-online/HANDOFF_TO_CLAUDE.md`
- 设计参照（迁移后）：`C:/Users/david/haoqi-online/legacy-prototype/`（当前原型仍在仓库根：`C:/Users/david/haoqi-online/index.html` 等）
- 远端仓库：`https://github.com/xing0325/haoqi-online-new.git`（默认分支 `main`，远端名不改）

---

## 开放问题 / 待负责人确认

以下是本 spec 在整合评审时**不擅自替负责人拍板**、需一句话确认的决策点（按优先级）。在确认前，实现者请采用各条标注的「默认」最保守做法。

1. **技术栈与迁移确认（P0，吸收 handoff 评审 high）。** handoff 原文把「最终用什么栈、是否迁移到 Next/Supabase 并重建仓库」保留给负责人；共享背景标为「已锁定」。请确认：是否已对「迁移到 Next + Supabase、按 §6 重组仓库」给过明确口头确认？**默认：** 视为已锁，但在拿到一句确认前，§4 / §6 当作「候选方案」，先只做 §6.0 仓库整理这类低风险动作，不大规模铺 Next 脚手架。

2. **首切片是否纳入「最小发帖编辑器」（P0，吸收 scope 评审 high）。** 本 spec 默认**方案 A**：首切片不做发帖 UI，Post 由 seed/后台灌入，发帖编辑器延后 v2。若负责人希望首切片就能让老师在界面发帖，则需把「最小发帖编辑器 + 图片上传链路」加进 IN 并补一节规格（工作量明显增大）。**默认：方案 A。**

3. **首页 PULSE / 「最近社区动态」的形态（P1，吸收 intent + handoff 评审）。** 本 spec 默认保留「最近社区动态」为基于真 Post/Comment 的只读派生列表（守住社区味）。请确认：(a) 接受此只读派生方案；还是 (b) 暂时保留原型 PULSE 视觉骨架 + 「示例·建设中」遮罩；还是 (c) 确实砍掉换占位卡。**默认：(a)。**

4. **天气球去留（P2，吸收 intent + states 评审 low）。** 二选一：本切片直接移除天气球；或保留为纯装饰且无任何数字 / 无「实时天气」aria 文案。**默认：保留为纯装饰、去掉一切温度数字与实时措辞。**

5. **「有新动态」标记机制（P2，吸收 intent + scope + handoff 评审）。** 本 spec 默认改为**无状态派生规则**（该课最新已发布 Post 的 published_at 在最近 N=48 小时内），回避 localStorage 个人已读。请确认是否接受；若希望「个人已读、点过就不亮」，需后续切片专门设计已读账本（跨设备一致性、清零时机）。**默认：无状态派生规则，N=48h。**

6. **草稿可见性规则（P2，吸收 intent 评审 medium）。** handoff 原文是「草稿可见性由作者/空间规则决定」。本 spec 默认收口为「作者本人 + 同课 teacher/assistant + admin」。请确认此收口可接受，或给出空间级的不同规则。**默认：上述收口。**

7. **软删除 `deleted_at` 是否纳入首切片（P2，吸收 scope 评审 high）。** 本 spec 默认**纳入 IN**（撤回调课/删钓鱼评论后不复现，价值明确）。若首切片工期紧，可降级为「可选增强、后续补」。**默认：纳入 IN。**

8. **「正在发生」是否要客户端定时器（P3，吸收 scope 评审 low）。** 本 spec 默认「按页面加载时刻计算 + 标注『刷新更新』」，不做定时器。若希望「还有 N 分钟」实时走动，可加轻量客户端定时器。**默认：不做定时器，标注刷新更新。**