// 套用 supabase/migrations 到云库（无 Docker / 无 supabase CLI，直接用 pg 连接）。
// 用法：node --env-file=.env.local scripts/db-apply.mjs
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const PW = process.env.SUPABASE_DB_PASSWORD;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const REF = URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!PW || !REF) {
  console.error("缺 SUPABASE_DB_PASSWORD 或 NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

// 直连主机常为 IPv6；机器若无 IPv6 走 pooler(IPv4)。自动试到通为止。
const hosts = [
  { cs: `postgresql://postgres:${PW}@db.${REF}.supabase.co:5432/postgres`, label: "direct (IPv6)" },
  { cs: `postgresql://postgres.${REF}:${PW}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`, label: "pooler ap-southeast-1 (新加坡)" },
  { cs: `postgresql://postgres.${REF}:${PW}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`, label: "pooler ap-northeast-1 (东京)" },
  { cs: `postgresql://postgres.${REF}:${PW}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`, label: "pooler ap-southeast-2 (悉尼)" },
  { cs: `postgresql://postgres.${REF}:${PW}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`, label: "pooler ap-northeast-2 (首尔)" },
  { cs: `postgresql://postgres.${REF}:${PW}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`, label: "pooler ap-south-1 (孟买)" },
];

async function connect() {
  for (const h of hosts) {
    const client = new pg.Client({
      connectionString: h.cs,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 9000,
      query_timeout: 180000,
    });
    try {
      await client.connect();
      console.log("✓ 连上了：", h.label);
      return client;
    } catch (e) {
      console.log("✗", h.label, "—", e.code || e.message);
      try {
        await client.end();
      } catch {}
    }
  }
  throw new Error("所有候选连接都失败——可能要从 Settings → Database 复制 Session pooler 的 URI 给我");
}

const dir = path.resolve("supabase/migrations");
const only = process.argv[2]; // 可选：只套用文件名包含该串的迁移
const files = (await readdir(dir))
  .filter((f) => f.endsWith(".sql") && (!only || f.includes(only)))
  .sort();
console.log(`待套用 ${files.length} 个迁移：\n  ${files.join("\n  ")}\n`);

const client = await connect();
try {
  for (const f of files) {
    const sql = await readFile(path.join(dir, f), "utf8");
    process.stdout.write(`→ ${f} ... `);
    await client.query(sql);
    console.log("ok");
  }
  console.log("\n✅ 全部迁移套用完成");
} catch (e) {
  console.error("\n❌ 套用失败：", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
