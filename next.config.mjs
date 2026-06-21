/** @type {import('next').NextConfig} */

// 静态导出，部署到 GitHub Pages（项目页：https://xing0325.github.io/haoqi-online-new/）。
// 服务端能力（server component 取数 / server action / middleware）一律不用，
// 数据层走客户端 Supabase，安全靠数据库 RLS 兜底，使整站可静态托管。
const repo = "haoqi-online-new";
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export",
  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}/` : "",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
