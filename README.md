# 维界

一个移动端优先的新加坡本地华人生活社区原型。产品气质是“公开版微信群”：短消息、实时信息流、弱个人主页、弱粉丝关系，由 AI 自动把生活信息结构化。

## 功能

- 聊天式首页 feed
- 频道筛选：租房、二手、拼车、美食、避雷、找搭子、活动、求职
- 一句话发布
- 前端即时 AI 结构化：分类、地区、学校、价格、时间、标签、摘要
- Supabase 可选接入：读取、插入、Realtime 刷新
- 未配置 Supabase 时自动使用演示数据

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## Supabase

1. 在 Supabase SQL Editor 运行 `supabase/schema.sql`。
2. 在项目根目录创建 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的项目 URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的 publishable key
```

3. 在 Supabase Dashboard 为 `life_posts` 开启 Realtime Postgres Changes。

后续接真实 AI 时，可以把 `lib/ai-structure.ts` 替换为 API 调用，数据库结构不需要大改。
