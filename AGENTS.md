# AGENTS.md

这份文件给后续在本仓库工作的 Codex 和其他代码代理使用。

## 产品方向

这是一个面向新加坡本地华人的移动端优先生活社区网站。

核心隐喻是“公开版微信群”：

- 短消息是正常形态。
- 首页应该像正在滚动的新加坡本地微信群聊天记录。
- 用户应该感觉这里有普通人在交换真实生活信息。
- AI 应该在后台安静地把凌乱信息结构化，不抢走聊天流的真实感。

不要把产品做成：

- 小红书
- Facebook
- 传统论坛
- 房产门户
- 网红或内容创作者平台

优先保留：

- 聊天式信息流 UI
- 低门槛发布
- 地区、学校、价格、时间、标签提取
- 搜索和频道筛选
- 轻量本地信任信号，而不是复杂社交关系

避免强调：

- 粉丝
- 个人 IP
- 复杂个人主页
- 点赞数压力
- 精致长内容

## 技术栈

- Next.js App Router
- React
- Tailwind CSS
- Supabase
- TypeScript

关键路径：

- `app/page.tsx`：首页入口。
- `components/life-feed.tsx`：主信息流 UI 和发布流程。
- `lib/ai-structure.ts`：本地 AI 式分类和信息提取规则。
- `lib/mock-posts.ts`：未配置 Supabase 时的演示内容。
- `lib/supabase/client.ts`：浏览器端 Supabase client。
- `supabase/schema.sql`：数据库表结构、RLS 策略和 Realtime publication 设置。

## 本地开发

使用 Node.js 20.9 或更新版本。Next.js 16 需要较新的 Node 运行时。

常用命令：

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

开发服务器通常运行在：

```text
http://localhost:3000
```

如果本机 shell 默认 Node 版本过旧，请先切换到 Node 20+ 再运行 Next.js 命令。

## 环境变量

本地密钥放在 `.env.local`。不要提交 `.env.local`。

实时 Supabase 模式需要：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

本地也可能存在 Supabase secret key、Cloudflare R2 凭据等后端或未来集成变量。这些都不能进入 Git 历史。

只有 `NEXT_PUBLIC_` 前缀的变量可以暴露给浏览器端代码。

## Supabase 注意事项

当前公开信息流表是 `public.life_posts`。

依赖真实数据前，确认目标项目已经应用 `supabase/schema.sql`。该 schema 会：

- 创建 `life_posts`
- 启用 RLS
- 允许公开读取
- 允许匿名和登录用户插入短帖
- 将 `life_posts` 加入 `supabase_realtime`

修改数据库结构时，同步更新 `supabase/schema.sql`。

不要在客户端组件里暴露 `service_role`、`sb_secret_*` 或其他私钥。

## UI 指南

移动端优先。

第一屏要让网站即使内容不多，也显得“这里有人”。使用真实的新加坡本地中文生活例子，不要使用泛泛的占位内容。

推荐 UI 模式：

- 聊天气泡和紧凑信息流
- 横向频道标签
- 按地区、学校、预算、避雷关键词搜索
- 单一、低摩擦的发布框
- AI 元数据用安静的标签或 pill 展示

避免：

- 落地页 hero
- 卡片套卡片
- 厚重个人主页
- 装饰性渐变或单一色系
- 在 app 内用营销文案解释产品功能

界面应该轻、实用、有生活气。

## 代码指南

- 保持 TypeScript strict。
- 除非处理未类型化的第三方 payload，否则避免使用 `any`。
- AI 提取逻辑集中放在 `lib/ai-structure.ts`。
- Supabase 访问集中放在 `lib/supabase`。
- 优先做小而明确的组件修改，避免大范围重写。
- 保留 fallback mock feed，确保没有 Supabase 环境变量时页面仍然有内容。
- 交付重要改动前运行 `npm run typecheck` 和 `npm run lint`。

## Git 与安全

提交或推送前，检查是否误写密钥：

```bash
rg 'sb_secret|SUPABASE_SECRET|R2_SECRET|SECRET_ACCESS_KEY|CLOUDFLARE_R2_SECRET' -g '!.env.local' -g '!node_modules' -g '!.next'
```

不要提交：

- `.env.local`
- `.next`
- `node_modules`
- `*.tsbuildinfo`

如果凭据曾经被粘贴进聊天或误提交到仓库，正式上线前应轮换这些凭据。
