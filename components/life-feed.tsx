"use client";

import {
  Bell,
  ChevronDown,
  CirclePlus,
  MapPin,
  MessageCircle,
  Search,
  SendHorizontal,
  Sparkles,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { structurePost } from "@/lib/ai-structure";
import { seedPosts } from "@/lib/mock-posts";
import { createClient } from "@/lib/supabase/client";
import type { Channel, FeedPost, StructuredMeta } from "@/lib/types";

const channels: Channel[] = [
  "全部",
  "租房",
  "二手",
  "拼车",
  "美食",
  "避雷",
  "找搭子",
  "活动",
  "求职",
];

const suggestions = [
  "NTU附近求租，预算1200",
  "今晚有人拼车去JB吗",
  "转卖宜家桌子，Clementi自取",
  "这个中介靠谱吗",
];

export function LifeFeed() {
  const [activeChannel, setActiveChannel] = useState<Channel>("全部");
  const [posts, setPosts] = useState<FeedPost[]>(seedPosts);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isConnected] = useState(
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  );
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase
      .from("life_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data?.length) return;
        setPosts(data.map(mapSupabasePost));
      });

    const channel = supabase
      .channel("public-life-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "life_posts" },
        (payload) => {
          setPosts((current) => [mapSupabasePost(payload.new), ...current]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const preview = useMemo(() => {
    return draft.trim() ? structurePost(draft) : null;
  }, [draft]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const inChannel =
        activeChannel === "全部" || post.meta.category === activeChannel;
      const query = search.trim().toLowerCase();
      const inSearch =
        !query ||
        `${post.body} ${post.meta.tags.join(" ")} ${post.meta.district ?? ""} ${
          post.meta.school ?? ""
        }`
          .toLowerCase()
          .includes(query);

      return inChannel && inSearch;
    });
  }, [activeChannel, posts, search]);

  async function publishPost() {
    const body = draft.trim();
    if (!body) return;

    const meta = structurePost(body);
    const post: FeedPost = {
      id: `local-${Date.now()}`,
      author: "刚刚来的你",
      handle: "@local",
      avatar: "你",
      body,
      createdAt: "刚刚",
      replies: 0,
      meta,
    };

    setPosts((current) => [post, ...current]);
    setDraft("");
    composerRef.current?.focus();

    const supabase = createClient();
    if (!supabase) return;

    await supabase.from("life_posts").insert({
      body,
      author_name: post.author,
      author_handle: post.handle,
      category: meta.category,
      district: meta.district,
      school: meta.school,
      price: meta.price,
      time_hint: meta.time,
      place: meta.place,
      tags: meta.tags,
      ai_summary: meta.summary,
    });
  }

  return (
    <main className="min-h-screen pb-28 text-ink">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-[11px] font-medium text-leaf">新加坡华人生活流</p>
            <h1 className="text-xl font-semibold tracking-normal">狮城生活流</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill live={isConnected} />
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-black/8 bg-white text-ink shadow-sm"
              aria-label="通知"
            >
              <Bell size={18} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-4">
        <div className="flex items-center gap-2 rounded-full border border-black/8 bg-white px-3 py-2 shadow-sm">
          <Search size={17} className="shrink-0 text-black/40" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜地区、学校、预算、避雷..."
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-black/35"
          />
        </div>

        <nav className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {channels.map((channel) => (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel)}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm transition ${
                activeChannel === channel
                  ? "border-leaf bg-leaf text-white"
                  : "border-black/8 bg-white text-black/68"
              }`}
            >
              {channel}
            </button>
          ))}
        </nav>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-4">
        <div className="rounded-lg border border-black/8 bg-white p-3 shadow-lift">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CirclePlus size={18} className="text-coral" />
              随手发一句
            </div>
            <button className="flex items-center gap-1 text-xs text-black/45">
              公开可见
              <ChevronDown size={14} />
            </button>
          </div>

          <textarea
            ref={composerRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="例如：NTU附近求租，预算1200"
            rows={3}
            className="w-full resize-none rounded-md bg-mist/45 px-3 py-3 text-[16px] leading-6 outline-none placeholder:text-black/35"
          />

          {preview ? <AiPreview meta={preview} /> : null}

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setDraft(item)}
                  className="h-8 shrink-0 rounded-full bg-paper px-3 text-xs text-black/55"
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              onClick={publishPost}
              disabled={!draft.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-white disabled:bg-black/15"
              aria-label="发布"
            >
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4">
        <div className="mb-3 flex items-center justify-between text-xs text-black/45">
          <span>今天 · 实时生活流</span>
          <span>{filteredPosts.length} 条正在流动</span>
        </div>
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <PostBubble key={post.id} post={post} />
          ))}
        </div>
      </section>
    </main>
  );
}

function StatusPill({ live }: { live: boolean }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-full border border-black/8 bg-white px-3 text-xs text-black/55">
      <span
        className={`h-2 w-2 rounded-full ${live ? "bg-leaf" : "bg-gold"}`}
      />
      {live ? "实时" : "演示"}
    </div>
  );
}

function AiPreview({ meta }: { meta: StructuredMeta }) {
  return (
    <div className="mt-2 rounded-md border border-leaf/18 bg-leaf/7 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-leaf">
        <Sparkles size={14} />
        AI 已识别
      </div>
      <MetaLine meta={meta} compact />
    </div>
  );
}

function PostBubble({ post }: { post: FeedPost }) {
  return (
    <article className="flex gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf text-sm font-semibold text-white">
        {post.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-black/42">
          <span className="font-medium text-black/58">{post.author}</span>
          <span>{post.handle}</span>
          <span>{post.createdAt}</span>
        </div>
        <div className="rounded-lg rounded-tl-sm border border-black/6 bg-white px-3 py-2.5 shadow-sm">
          <p className="whitespace-pre-wrap break-words text-[15.5px] leading-6">
            {post.body}
          </p>
          <div className="mt-2 border-t border-black/6 pt-2">
            <MetaLine meta={post.meta} />
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-4 pl-1 text-xs text-black/42">
          <button className="flex items-center gap-1">
            <MessageCircle size={14} />
            {post.replies ? `${post.replies} 条回复` : "回复"}
          </button>
          <button className="flex items-center gap-1">
            <Tag size={14} />
            收藏线索
          </button>
        </div>
      </div>
    </article>
  );
}

function MetaLine({
  meta,
  compact = false,
}: {
  meta: StructuredMeta;
  compact?: boolean;
}) {
  const fields = [
    meta.category,
    meta.district,
    meta.school,
    meta.place,
    meta.price,
    meta.time,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-black/50">
      <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-1 font-medium text-leaf">
        <Sparkles size={12} />
        {meta.summary}
      </span>
      {!compact
        ? fields.slice(1).map((field) => (
            <span
              key={field}
              className="inline-flex items-center gap-1 rounded-full bg-mist/60 px-2 py-1"
            >
              <MapPin size={12} />
              {field}
            </span>
          ))
        : null}
      {meta.tags.map((tag) => (
        <span key={tag} className="rounded-full bg-coral/9 px-2 py-1 text-coral">
          #{tag}
        </span>
      ))}
    </div>
  );
}

function mapSupabasePost(row: Record<string, any>): FeedPost {
  return {
    id: String(row.id),
    author: row.author_name ?? "匿名用户",
    handle: row.author_handle ?? "@sg",
    avatar: (row.author_name ?? "匿").slice(0, 1),
    body: row.body,
    createdAt: formatRelativeTime(row.created_at),
    replies: row.reply_count ?? 0,
    meta: {
      category: row.category,
      district: row.district ?? undefined,
      school: row.school ?? undefined,
      price: row.price ?? undefined,
      time: row.time_hint ?? undefined,
      place: row.place ?? undefined,
      tags: row.tags ?? [],
      summary: row.ai_summary ?? row.category,
    },
  };
}

function formatRelativeTime(value?: string) {
  if (!value) return "刚刚";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  return `${Math.floor(hours / 24)}天前`;
}
