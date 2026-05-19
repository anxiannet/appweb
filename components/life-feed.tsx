"use client";

import {
  Bell,
  Plus,
  Search,
  SendHorizontal,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { structurePost } from "@/lib/ai-structure";
import { seedPosts } from "@/lib/mock-posts";
import { createClient } from "@/lib/supabase/client";
import type { Channel, FeedPost } from "@/lib/types";

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

const timeGroupGapMs = 10 * 60 * 1000;

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
  const feedEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    composer.style.height = "0px";
    composer.style.height = `${Math.min(composer.scrollHeight, 120)}px`;
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

  const displayedPosts = useMemo(() => {
    return [...filteredPosts].reverse();
  }, [filteredPosts]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: "end" });
  }, [displayedPosts.length, activeChannel, search]);

  async function publishPost() {
    const body = draft.trim();
    if (!body) return;

    const meta = structurePost(body);
    const createdAtMs = Date.now();
    const post: FeedPost = {
      id: `local-${createdAtMs}`,
      author: "刚刚来的你",
      handle: "@local",
      avatar: "你",
      body,
      createdAt: "刚刚",
      createdAtMs,
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

  function publishOnEnter(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    void publishPost();
  }

  return (
    <main className="min-h-screen bg-paper pb-[calc(10rem+env(safe-area-inset-bottom))] text-ink">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <div className="min-w-0">
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

        <section className="mx-auto max-w-3xl px-4 pb-3">
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
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-4">
        <div className="mb-3 flex items-center justify-between text-xs text-black/45">
          <span>今天 · 最新在下面</span>
          <span>{filteredPosts.length} 条正在流动</span>
        </div>
        <div className="space-y-3">
          {displayedPosts.map((post, index) => {
            const previousPost = displayedPosts[index - 1];
            const showTime =
              !previousPost ||
              post.createdAtMs - previousPost.createdAtMs > timeGroupGapMs;

            return (
              <Fragment key={post.id}>
                {showTime ? <TimeDivider label={post.createdAt} /> : null}
                <PostBubble post={post} />
              </Fragment>
            );
          })}
          <div ref={feedEndRef} />
        </div>
      </section>

      <section className="fixed inset-x-0 bottom-0 z-40 border-t border-black/8 bg-paper/94 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl">
          {!draft.trim() ? (
            <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setDraft(item)}
                  className="h-8 shrink-0 rounded-full bg-white px-3 text-xs text-black/50 shadow-sm"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <button
              className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/8 bg-white text-black/55 shadow-sm"
              aria-label="添加"
            >
              <Plus size={19} />
            </button>
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={publishOnEnter}
              placeholder="发到公开生活群..."
              rows={1}
              className="max-h-[120px] min-h-10 flex-1 resize-none rounded-2xl border border-black/8 bg-white px-4 py-2.5 text-[16px] leading-5 shadow-sm outline-none placeholder:text-black/35"
            />
            <button
              onClick={publishPost}
              disabled={!draft.trim()}
              className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-white shadow-sm transition disabled:bg-black/15 disabled:shadow-none"
              aria-label="发布"
            >
              <SendHorizontal size={18} />
            </button>
          </div>
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

function TimeDivider({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] text-black/38">
        {label}
      </span>
    </div>
  );
}

function PostBubble({ post }: { post: FeedPost }) {
  const isMine = post.handle === "@local" || post.id.startsWith("local-");
  const identity = getDisplayIdentity(post);

  return (
    <article className={`flex gap-2.5 ${isMine ? "justify-end" : ""}`}>
      {!isMine ? (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf text-sm font-semibold text-white">
          {identity.avatar}
        </div>
      ) : null}
      <div className={`min-w-0 max-w-[82%] ${isMine ? "items-end" : ""}`}>
        {!isMine ? (
          <div className="mb-1 flex items-center gap-2 text-xs text-black/42">
            <span className="font-medium text-black/58">{identity.author}</span>
          </div>
        ) : null}
        <div
          className={`rounded-lg border border-black/6 px-3 py-2.5 shadow-sm ${
            isMine
              ? "rounded-tr-sm bg-leaf text-white"
              : "rounded-tl-sm bg-white"
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-[15.5px] leading-6">
            {post.body}
          </p>
        </div>
      </div>
      {isMine ? (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral text-sm font-semibold text-white">
          {identity.avatar}
        </div>
      ) : null}
    </article>
  );
}

function getDisplayIdentity(post: FeedPost) {
  const isAnonymous =
    post.author.includes("匿名") ||
    post.handle.toLowerCase().includes("anon") ||
    post.handle === "@sg";

  if (!isAnonymous) {
    return {
      author: post.author,
      avatar: post.avatar,
    };
  }

  const anonymousNumber = String(hashText(post.id) % 1000).padStart(3, "0");

  return {
    author: `共振者 ${anonymousNumber}`,
    avatar: anonymousNumber.slice(-2),
  };
}

function hashText(value: string) {
  return Array.from(value).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function mapSupabasePost(row: Record<string, any>): FeedPost {
  const createdAtMs = row.created_at ? new Date(row.created_at).getTime() : Date.now();

  return {
    id: String(row.id),
    author: row.author_name ?? "匿名用户",
    handle: row.author_handle ?? "@sg",
    avatar: (row.author_name ?? "匿").slice(0, 1),
    body: row.body,
    createdAt: formatRelativeTime(row.created_at),
    createdAtMs,
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
