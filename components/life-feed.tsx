"use client";

import {
  Bell,
  LoaderCircle,
  LogIn,
  LogOut,
  Mail,
  Plus,
  Search,
  SendHorizontal,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { seedPosts } from "@/lib/mock-posts";
import { createClient } from "@/lib/supabase/client";
import type { FeedPost, StructuredMeta } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const unifiedCategory: FeedPost["meta"]["category"] = "找搭子";

const suggestions = [
  "NTU附近求租，预算1200",
  "今晚有人拼车去JB吗",
  "转卖宜家桌子，Clementi自取",
  "这个中介靠谱吗",
];

const timeGroupGapMs = 10 * 60 * 1000;
const recentFeedWindowMs = 24 * 60 * 60 * 1000;
const anonymousVisitorKey = "sg-life-feed-anonymous-visitor";
const hasPublishedPostKey = "sg-life-feed-has-published-post";
const hasAcceptedTermsKey = "sg-life-feed-has-accepted-terms";
const postImagesBucket = "life-post-images";
const maxImageSizeBytes = 5 * 1024 * 1024;

type AuthMode = "sign-in" | "sign-up";

type AuthMessage = {
  tone: "good" | "bad" | "quiet";
  text: string;
};

type ComposerMessage = AuthMessage;

type LifePostRow = {
  id: string;
  created_at?: string;
  body: string;
  author_name?: string | null;
  author_handle?: string | null;
  category: FeedPost["meta"]["category"];
  district?: string | null;
  school?: string | null;
  price?: string | null;
  time_hint?: string | null;
  place?: string | null;
  tags?: string[] | null;
  ai_summary?: string | null;
  image_path?: string | null;
  reply_count?: number | null;
};

type FeedIdentity = {
  author: string;
  handle: string;
  avatar: string;
};

export function LifeFeed() {
  const [posts, setPosts] = useState<FeedPost[]>(seedPosts);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [composerMessage, setComposerMessage] = useState<ComposerMessage | null>(
    null,
  );
  const [anonymousIdentity, setAnonymousIdentity] = useState<FeedIdentity | null>(
    null,
  );
  const [authOpen, setAuthOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasPublishedPost, setHasPublishedPost] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isConnected] = useState(
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  );
  const supabase = useMemo(() => createClient(), []);
  const currentIdentity = user ? getSignedInUserIdentity(user) : anonymousIdentity;
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAnonymousIdentity(getAnonymousVisitorIdentity());
      setHasPublishedPost(hasVisitorPublishedPost());
      setHasAcceptedTerms(hasVisitorAcceptedTerms());
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const feedWindowStart = new Date(Date.now() - recentFeedWindowMs).toISOString();

    supabase
      .from("life_posts")
      .select("*")
      .gte("created_at", feedWindowStart)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          setComposerMessage({
            tone: "bad",
            text: `读取实时消息失败：${error.message}`,
          });
          return;
        }

        setPosts(data?.map(mapSupabasePost) ?? []);
      });

    const channel = supabase
      .channel("public-life-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "life_posts" },
        (payload) => {
          const nextPost = mapSupabasePost(payload.new as LifePostRow);
          if (!isRecentPost(nextPost, Date.now())) return;

          setPosts((current) =>
            current.some((post) => post.id === nextPost.id)
              ? current
              : [nextPost, ...current],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setAuthOpen(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    composer.style.height = "0px";
    composer.style.height = `${Math.min(composer.scrollHeight, 120)}px`;
  }, [draft]);

  const filteredPosts = useMemo(() => {
    const feedWindowStartMs = nowMs - recentFeedWindowMs;

    return posts.filter((post) => {
      const inRecentWindow = post.createdAtMs >= feedWindowStartMs;
      const query = search.trim().toLowerCase();
      const inSearch =
        !query ||
        `${post.body} ${post.meta.tags.join(" ")} ${post.meta.district ?? ""} ${
          post.meta.school ?? ""
        }`
          .toLowerCase()
          .includes(query);

      return inRecentWindow && inSearch;
    });
  }, [nowMs, posts, search]);

  const displayedPosts = useMemo(() => {
    return [...filteredPosts].reverse();
  }, [filteredPosts]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: "end" });
  }, [displayedPosts.length, search]);

  function publishLocalPost(post: FeedPost, message: ComposerMessage) {
    setPosts((current) =>
      current.some((item) => item.id === post.id) ? current : [post, ...current],
    );
    setDraft("");
    markVisitorHasPublishedPost();
    setHasPublishedPost(true);
    setComposerMessage(message);
    composerRef.current?.focus();
  }

  async function publishRemotePost(post: FeedPost) {
    const { data, error } = await supabase!
      .from("life_posts")
      .insert({
        body: post.body,
        author_name: post.author,
        author_handle: post.handle,
        category: post.meta.category,
        district: post.meta.district,
        school: post.meta.school,
        price: post.meta.price,
        time_hint: post.meta.time,
        place: post.meta.place,
        tags: post.meta.tags,
        ai_summary: post.meta.summary,
        image_path: post.imagePath,
      })
      .select("*")
      .single();

    return { data, error };
  }

  async function publishPost(skipTermsCheck = false) {
    const body = draft.trim();
    if (!body || isPublishing) return;

    if (!skipTermsCheck && !hasAcceptedTerms) {
      setTermsOpen(true);
      setComposerMessage({
        tone: "quiet",
        text: "请先阅读并同意使用条款，再发布内容。",
      });
      return;
    }

    const meta = makeManualPostMeta(body);
    const createdAtMs = Date.now();
    const identity = user
      ? getSignedInUserIdentity(user)
      : (anonymousIdentity ?? getAnonymousVisitorIdentity());
    const post: FeedPost = {
      id: `local-${createdAtMs}`,
      author: identity.author,
      handle: identity.handle,
      avatar: identity.avatar,
      body,
      createdAt: "刚刚",
      createdAtMs,
      replies: 0,
      meta,
    };

    if (!supabase) {
      publishLocalPost(post, {
        tone: "quiet",
        text: "当前是演示模式，这条只会显示在你自己的浏览器里。",
      });
      return;
    }

    setIsPublishing(true);
    setComposerMessage({ tone: "quiet", text: "正在发到公开生活群..." });

    try {
      const { data, error } = await publishRemotePost(post);

      if (error) {
        publishLocalPost(post, {
          tone: "quiet",
          text: `已显示在本地，暂时没有同步到实时数据库：${error.message}`,
        });
        return;
      }

      const savedPost = mapSupabasePost(data as LifePostRow);
      setPosts((current) =>
        current.some((item) => item.id === savedPost.id)
          ? current
          : [savedPost, ...current],
      );
      setDraft("");
      markVisitorHasPublishedPost();
      setHasPublishedPost(true);
      setComposerMessage(null);
      composerRef.current?.focus();
    } catch (error) {
      publishLocalPost(post, {
        tone: "quiet",
        text: `已显示在本地，暂时没有同步到实时数据库：${getErrorMessage(error)}`,
      });
    } finally {
      setIsPublishing(false);
    }
  }

  function publishOnEnter(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    void publishPost();
  }

  async function publishImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!hasAcceptedTerms) {
      setTermsOpen(true);
      setComposerMessage({
        tone: "quiet",
        text: "请先阅读并同意使用条款，再发布图片。",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setComposerMessage({ tone: "bad", text: "请选择图片文件。" });
      return;
    }

    if (file.size > maxImageSizeBytes) {
      setComposerMessage({ tone: "bad", text: "图片不能超过 5MB。" });
      return;
    }

    const createdAtMs = Date.now();
    const identity = user
      ? getSignedInUserIdentity(user)
      : (anonymousIdentity ?? getAnonymousVisitorIdentity());
    const body = draft.trim();
    const meta = makeManualPostMeta(body || "图片消息");
    const post: FeedPost = {
      id: `local-image-${createdAtMs}`,
      author: identity.author,
      handle: identity.handle,
      avatar: identity.avatar,
      body,
      imageUrl: URL.createObjectURL(file),
      createdAt: "刚刚",
      createdAtMs,
      replies: 0,
      meta,
    };

    if (!supabase) {
      publishLocalPost(post, {
        tone: "quiet",
        text: "当前是演示模式，图片只会显示在你自己的浏览器里。",
      });
      setComposerMessage(null);
      return;
    }

    setIsPublishing(true);
    setComposerMessage({ tone: "quiet", text: "正在上传图片..." });

    try {
      const imagePath = makePostImagePath(file, createdAtMs);
      const { error: uploadError } = await supabase.storage
        .from(postImagesBucket)
        .upload(imagePath, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        publishLocalPost(post, {
          tone: "quiet",
          text: `图片已显示在本地，暂时没有上传到 Storage：${uploadError.message}`,
        });
        return;
      }

      const uploadedPost: FeedPost = {
        ...post,
        imagePath,
        imageUrl: getPublicImageUrl(imagePath) ?? post.imageUrl,
      };
      const { data, error } = await publishRemotePost(uploadedPost);

      if (error) {
        publishLocalPost(uploadedPost, {
          tone: "quiet",
          text: `图片已上传，但帖子暂时没有同步到实时数据库：${error.message}`,
        });
        return;
      }

      const savedPost = mapSupabasePost(data as LifePostRow);
      setPosts((current) =>
        current.some((item) => item.id === savedPost.id)
          ? current
          : [savedPost, ...current],
      );
      setDraft("");
      markVisitorHasPublishedPost();
      setHasPublishedPost(true);
      setComposerMessage(null);
      composerRef.current?.focus();
    } catch (error) {
      publishLocalPost(post, {
        tone: "quiet",
        text: `图片已显示在本地，暂时没有同步到实时数据库：${getErrorMessage(error)}`,
      });
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-transparent pb-[calc(8rem+env(safe-area-inset-bottom))] pt-[5.75rem] text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[url('/brand/chat-background.png')] bg-cover bg-center bg-no-repeat opacity-30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-paper/82 backdrop-blur-[1px]"
      />
      <header className="fixed inset-x-0 top-0 z-30 border-b border-[#eadfce] bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/brand/weijie-icon.png"
              alt="维界"
              width={40}
              height={40}
              priority
              className="shrink-0 rounded-2xl shadow-bubble ring-2 ring-white"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-leaf">新加坡华人生活流</p>
              <h1 className="text-xl font-semibold tracking-normal">维界</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill live={isConnected} />
            <AuthButton
              connected={isConnected}
              user={user}
              onOpen={() => setAuthOpen(true)}
              onSignOut={() => {
                void supabase?.auth.signOut();
              }}
            />
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-black/8 bg-white text-ink shadow-bubble"
              aria-label="通知"
            >
              <Bell size={18} />
            </button>
          </div>
        </div>

        <section className="mx-auto max-w-3xl px-4 pb-3">
          <div className="flex items-center gap-2 rounded-2xl border border-black/8 bg-white px-3 py-2 shadow-bubble">
            <Search size={17} className="shrink-0 text-black/40" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜地区、学校、预算、避雷..."
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-black/35"
            />
          </div>
        </section>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-4 pt-4">
        <div className="mb-3 flex items-center justify-between px-1 text-xs text-black/45">
          <span>最近24小时 · 最新在下面</span>
          <span>公开生活群</span>
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
                <PostBubble post={post} currentHandle={currentIdentity?.handle} />
              </Fragment>
            );
          })}
          <div ref={feedEndRef} />
        </div>
      </section>

      <section className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eadfce] bg-paper/92 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl">
          {!hasPublishedPost && !draft.trim() ? (
            <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setDraft(item)}
                  className="h-8 shrink-0 rounded-full border border-white bg-white/92 px-3 text-xs text-black/55 shadow-bubble"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          {composerMessage ? (
            <p
              className={`mb-2 px-1 text-xs ${
                composerMessage.tone === "bad"
                  ? "text-coral"
                  : composerMessage.tone === "good"
                    ? "text-leaf"
                    : "text-black/45"
              }`}
            >
              {composerMessage.text}
            </p>
          ) : null}

          <div className="flex items-end gap-2">
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={publishOnEnter}
              placeholder="发到公开生活流..."
              rows={1}
              className="max-h-[120px] min-h-11 flex-1 resize-none rounded-[1.35rem] border border-black/8 bg-white px-4 py-3 text-[16px] leading-5 shadow-bubble outline-none placeholder:text-black/35"
            />
            <button
              onClick={() => {
                void publishPost();
              }}
              disabled={!draft.trim() || isPublishing}
              className="mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral text-white shadow-bubble transition disabled:bg-black/15 disabled:shadow-none"
              aria-label="发布"
            >
              {isPublishing ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <SendHorizontal size={18} />
              )}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={publishImage}
            />
            <button
              type="button"
              onClick={() => {
                if (!hasAcceptedTerms) {
                  setTermsOpen(true);
                  setComposerMessage({
                    tone: "quiet",
                    text: "请先阅读并同意使用条款，再发布图片。",
                  });
                  return;
                }

                imageInputRef.current?.click();
              }}
              disabled={isPublishing}
              className="mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/8 bg-white text-black/55 shadow-bubble"
              aria-label="发送图片"
              title="发送图片"
            >
              <Plus size={19} />
            </button>
          </div>
        </div>
      </section>

      {authOpen ? (
        <AuthSheet
          connected={isConnected}
          onClose={() => setAuthOpen(false)}
          onSignedIn={(nextUser) => {
            setUser(nextUser);
            setAuthOpen(false);
          }}
        />
      ) : null}
      {termsOpen ? (
        <TermsSheet
          onAccept={() => {
            markVisitorAcceptedTerms();
            setHasAcceptedTerms(true);
            setTermsOpen(false);
            setComposerMessage(null);
            if (draft.trim()) {
              window.setTimeout(() => {
                void publishPost(true);
              }, 0);
              return;
            }

            composerRef.current?.focus();
          }}
          onClose={() => setTermsOpen(false)}
        />
      ) : null}
    </main>
  );
}

function StatusPill({ live }: { live: boolean }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-full border border-black/8 bg-white/92 px-3 text-xs font-medium text-black/55 shadow-sm">
      <span
        className={`h-2 w-2 rounded-full ${live ? "bg-leaf" : "bg-gold"}`}
      />
      {live ? "实时" : "演示"}
    </div>
  );
}

function AuthButton({
  connected,
  user,
  onOpen,
  onSignOut,
}: {
  connected: boolean;
  user: User | null;
  onOpen: () => void;
  onSignOut: () => void;
}) {
  if (!connected) {
    return (
      <button
        className="grid h-10 w-10 place-items-center rounded-full border border-black/8 bg-white text-black/35 shadow-bubble"
        aria-label="演示模式暂不可登录"
        title="演示模式暂不可登录"
      >
        <UserRound size={17} />
      </button>
    );
  }

  if (!user) {
    return (
      <button
        onClick={onOpen}
        className="grid h-10 w-10 place-items-center rounded-full border border-black/8 bg-white text-ink shadow-bubble"
        aria-label="登录或注册"
      >
        <LogIn size={18} />
      </button>
    );
  }

  const identity = getSignedInUserIdentity(user);

  return (
    <button
      onClick={onSignOut}
      className="flex h-10 items-center gap-2 rounded-full border border-black/8 bg-white pl-2 pr-3 text-sm text-black/62 shadow-bubble"
      aria-label="退出登录"
      title="退出登录"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-coral text-xs font-semibold text-white">
        {identity.avatar}
      </span>
      <LogOut size={15} />
    </button>
  );
}

function AuthSheet({
  connected,
  onClose,
  onSignedIn,
}: {
  connected: boolean;
  onClose: () => void;
  onSignedIn: (user: User) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<AuthMessage>({
    tone: "quiet",
    text: "登录后发帖会显示一个轻量昵称；不影响浏览公开内容。",
  });
  const [busy, setBusy] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !connected) {
      setMessage({ tone: "bad", text: "当前没有配置 Supabase，暂时只能浏览演示内容。" });
      return;
    }

    const cleanEmail = email.trim();
    const cleanName = displayName.trim();

    if (!cleanEmail || password.length < 6) {
      setMessage({ tone: "bad", text: "请填写邮箱，并使用至少 6 位密码。" });
      return;
    }

    setBusy(true);
    setMessage({ tone: "quiet", text: "正在处理..." });

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })
        : await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                display_name: cleanName || cleanEmail.split("@")[0],
              },
            },
          });

    setBusy(false);

    if (result.error) {
      setMessage({ tone: "bad", text: result.error.message });
      return;
    }

    if (result.data.session?.user) {
      onSignedIn(result.data.session.user);
      return;
    }

    setMessage({
      tone: "good",
      text: "注册邮件已经发出，请先去邮箱确认，再回来登录。",
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/18 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-16 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl">
        <form
          onSubmit={submitAuth}
          className="ml-auto w-full max-w-sm rounded-[1.6rem] border border-white bg-paper p-3 shadow-lift"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="inline-flex rounded-full bg-white p-1 shadow-bubble">
              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className={`h-8 rounded-full px-3 text-sm ${
                  mode === "sign-in"
                    ? "bg-leaf text-white"
                    : "text-black/55"
                }`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => setMode("sign-up")}
                className={`h-8 rounded-full px-3 text-sm ${
                  mode === "sign-up"
                    ? "bg-leaf text-white"
                    : "text-black/55"
                }`}
              >
                注册
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-black/55 shadow-bubble"
              aria-label="关闭"
            >
              <X size={17} />
            </button>
          </div>

          <div className="space-y-2">
            {mode === "sign-up" ? (
              <label className="flex h-11 items-center gap-2 rounded-2xl border border-black/8 bg-white px-3">
                <UserRound size={16} className="shrink-0 text-black/35" />
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="群里怎么称呼你"
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-black/35"
                />
              </label>
            ) : null}

            <label className="flex h-11 items-center gap-2 rounded-2xl border border-black/8 bg-white px-3">
              <Mail size={16} className="shrink-0 text-black/35" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="邮箱"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-black/35"
                autoComplete="email"
              />
            </label>

            <label className="flex h-11 items-center gap-2 rounded-2xl border border-black/8 bg-white px-3">
              <span className="grid h-4 w-4 place-items-center text-xs text-black/35">
                *
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="密码"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-black/35"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
              />
            </label>
          </div>

          <p
            className={`mt-3 min-h-5 text-xs ${
              message.tone === "bad"
                ? "text-coral"
                : message.tone === "good"
                  ? "text-leaf"
                  : "text-black/45"
            }`}
          >
            {message.text}
          </p>

          <button
            type="submit"
            disabled={busy}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-coral px-4 text-sm font-medium text-white shadow-bubble disabled:bg-black/18"
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
            {mode === "sign-in" ? "进入生活流" : "注册账号"}
          </button>
        </form>
      </div>
    </div>
  );
}

function TermsSheet({
  onAccept,
  onClose,
}: {
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/18 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-10 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-3xl items-end sm:items-center">
        <section className="flex max-h-[88vh] w-full flex-col rounded-[1.6rem] border border-white bg-paper shadow-lift">
          <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-ink">使用条款</h2>
              <p className="mt-0.5 text-xs text-black/45">发布前请阅读并同意</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-black/55 shadow-bubble"
              aria-label="关闭使用条款"
            >
              <X size={17} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm leading-6 text-black/72">
            <p>
              欢迎使用本平台。本平台是一个面向新加坡本地华人生活的信息交流社区，用户可发布、浏览及交流租房、二手交易、拼车、本地活动、求职招聘、美食推荐、生活求助与本地讨论等信息。
            </p>
            <p>
              当您访问、注册、发布内容或使用本平台服务时，即表示您已阅读、理解并同意遵守以下条款。
            </p>

            <TermsSection
              title="一、平台性质"
              items={[
                "平台仅提供信息展示、交流与内容组织服务。",
                "平台不直接参与用户之间的交易、房屋租赁合同、金融支付、线下活动、商品交付或服务履约。",
                "用户之间产生的行为与风险，由用户自行承担。",
              ]}
            />
            <TermsSection
              title="二、用户责任"
              items={[
                "用户必须保证发布的信息真实、合法、有效，并对所发布内容拥有合法权利或授权。",
                "用户不得侵犯任何第三方权益，必须遵守新加坡现行法律法规。",
                "禁止发布违法、虚假、欺诈、骚扰、侵权、误导性内容，包括虚假房源、非法转租、诈骗、赌博、色情、暴力、仇恨、非法招聘、非法金融服务、侵犯隐私或其他违反新加坡法律法规的内容。",
                "用户需自行承担因其发布内容所产生的一切法律责任。",
              ]}
            />
            <TermsSection
              title="三、房源与交易信息"
              items={[
                "用户发布房源、商品或服务时，应确保已获得合法授权，信息真实准确，图片与描述不具有误导性。",
                "不得侵犯第三方平台版权、内容权益或使用条款。",
                "平台有权删除涉嫌违规内容，限制或封禁账号，要求用户提供相关证明材料，并配合新加坡执法机关调查。",
              ]}
            />
            <TermsSection
              title="四、用户名与账号名称"
              items={[
                "用户名、昵称、频道名、群组名或其他公开标识不代表用户拥有永久性、排他性或所有权。",
                "平台可回收长期未使用的用户名，修改、冻结或收回涉嫌违规、侵权、冒充、误导、抢注或不符合规范的用户名。",
                "用户名仅为平台使用权限的一部分，不构成资产、知识产权或永久使用权，平台保留最终解释与管理权。",
              ]}
            />
            <TermsSection
              title="五、用户生成内容（UGC）"
              items={[
                "用户保留其发布内容的所有权。",
                "用户同意平台可在全球范围内、非独占、可转授权地使用用户发布、上传、输入或提交的文本、图片、标签、评论、对话内容、行为数据与互动记录。",
                "使用目的包括平台展示、搜索优化、内容推荐、AI分类与标签生成、数据分析、机器学习训练、产品功能优化、安全风控与用户体验改进。",
                "平台不会出售用户私人身份信息。",
              ]}
            />
            <TermsSection
              title="六、AI与自动化处理"
              items={[
                "平台可能使用人工智能技术对用户内容进行自动分类、自动摘要、自动推荐、自动审核、自动标签生成与风险识别。",
                "AI生成结果可能存在误差，仅供参考，平台不保证AI分析结果绝对准确。",
              ]}
            />
            <TermsSection
              title="七、隐私与数据"
              items={[
                "平台将尽合理努力保护用户数据安全，但互联网服务无法保证绝对安全。",
                "用户不得上传身份证件、银行卡信息、密码、金融账户、他人隐私资料等敏感信息。",
              ]}
            />
            <TermsSection
              title="八、免责声明"
              items={[
                "平台不对用户发布内容真实性、用户之间交易纠纷、房屋质量、租赁纠纷、二手商品质量、拼车或线下活动风险、用户行为造成的损失、AI分析结果准确性承担责任。",
                "用户因使用平台而产生的任何直接或间接损失，以及所有线下接触与交易风险，均由用户自行承担。",
              ]}
            />
            <TermsSection
              title="九、内容管理权"
              items={[
                "平台有权根据自身判断删除内容、隐藏帖子、降低曝光、限制功能、封禁账号、限制访问或调整平台规则，且无需提前通知用户。",
              ]}
            />
            <TermsSection
              title="十、条款修改"
              items={[
                "平台有权随时修改本条款。修改后的条款将在平台发布后生效，用户继续使用平台即视为接受最新条款。",
              ]}
            />
            <TermsSection
              title="十一、适用法律"
              items={[
                "本条款受新加坡法律管辖。因平台使用所产生的争议，应提交新加坡法院处理。",
              ]}
            />
            <TermsSection
              title="十二、联系方式"
              items={["如有问题，请联系平台管理员。"]}
            />
          </div>

          <div className="border-t border-black/8 p-3">
            <button
              type="button"
              onClick={onAccept}
              className="flex h-11 w-full items-center justify-center rounded-full bg-coral px-4 text-sm font-semibold text-white shadow-bubble"
            >
              我已阅读并同意使用条款
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function TermsSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold text-ink">{title}</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="pl-3 before:float-left before:-ml-3 before:content-['•']">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TimeDivider({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full border border-white bg-white/70 px-2.5 py-1 text-[11px] font-medium text-black/38 shadow-sm">
        {label}
      </span>
    </div>
  );
}

function PostBubble({
  post,
  currentHandle,
}: {
  post: FeedPost;
  currentHandle?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMine =
    post.id.startsWith("local-") ||
    (Boolean(currentHandle) && post.handle === currentHandle);
  const identity = getDisplayIdentity(post);
  const shouldCollapse =
    post.body.length > 120 || post.body.split("\n").length > 4;
  const isCollapsed = shouldCollapse && !isExpanded;

  return (
    <article className={`flex gap-2.5 ${isMine ? "justify-end" : ""}`}>
      {!isMine ? (
        <div className="mt-5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf text-sm font-semibold text-white">
          {identity.avatar}
        </div>
      ) : null}
      <div className={`flex min-w-0 max-w-[82%] flex-col ${isMine ? "items-end" : "items-start"}`}>
        <div
          className={`mb-1 px-1 text-xs font-semibold text-black/50 ${
            isMine ? "text-right" : "text-left"
          }`}
        >
          {identity.author}
        </div>
        {post.imageUrl ? (
          <div className={post.body ? "mb-2" : ""}>
            {/* Local blob previews cannot be optimized by next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt="聊天图片"
              className="max-h-80 w-full rounded-lg object-cover"
            />
          </div>
        ) : null}
        {post.body ? (
          <div
            className={`rounded-lg border border-black/6 px-3 py-2.5 shadow-sm ${
              isMine
                ? "rounded-tr-sm bg-leaf text-white"
                : "rounded-tl-sm bg-white"
            }`}
          >
            <p
              className={`whitespace-pre-wrap break-words text-[15.5px] leading-6 ${
                isCollapsed ? "max-h-24 overflow-hidden" : ""
              }`}
            >
              {post.body}
            </p>
            {shouldCollapse ? (
              <button
                type="button"
                onClick={() => setIsExpanded((current) => !current)}
                className={`mt-1 text-xs font-medium ${
                  isMine ? "text-white/78" : "text-leaf"
                }`}
              >
                {isExpanded ? "收起" : "展开"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {isMine ? (
        <div className="mt-5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral text-sm font-semibold text-white">
          {identity.avatar}
        </div>
      ) : null}
    </article>
  );
}

function getDisplayIdentity(post: FeedPost) {
  if (post.handle.startsWith("@anon_")) {
    return {
      author: post.author,
      avatar: post.avatar,
    };
  }

  const isAnonymous =
    post.author.includes("匿名") ||
    post.handle.toLowerCase().includes("anon") ||
    post.handle === "@local" ||
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

function getSignedInUserIdentity(user: User) {
  const displayName = getStringMetadata(user, "display_name");
  const emailPrefix = user.email?.split("@")[0] ?? "sg";
  const author = displayName || emailPrefix;

  return {
    author,
    handle: `@${emailPrefix.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 18) || "sg"}`,
    avatar: author.slice(0, 1).toUpperCase(),
  };
}

function getAnonymousVisitorIdentity() {
  const visitorId = getAnonymousVisitorId();
  const anonymousNumber = String(hashText(visitorId) % 1000).padStart(3, "0");

  return {
    author: `共振者 ${anonymousNumber}`,
    handle: `@anon_${visitorId.slice(0, 8)}`,
    avatar: anonymousNumber.slice(-2),
  };
}

function getAnonymousVisitorId() {
  if (typeof window === "undefined") return createAnonymousVisitorId();

  const storedVisitorId = window.localStorage.getItem(anonymousVisitorKey);
  if (storedVisitorId) return storedVisitorId;

  const visitorId = createAnonymousVisitorId();
  window.localStorage.setItem(anonymousVisitorKey, visitorId);
  return visitorId;
}

function hasVisitorPublishedPost() {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(hasPublishedPostKey) === "true";
}

function hasVisitorAcceptedTerms() {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(hasAcceptedTermsKey) === "true";
}

function markVisitorHasPublishedPost() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(hasPublishedPostKey, "true");
}

function markVisitorAcceptedTerms() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(hasAcceptedTermsKey, "true");
}

function createAnonymousVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }

  return Math.random().toString(36).slice(2, 18).padEnd(16, "0");
}

function getStringMetadata(user: User, key: string) {
  const value = user.user_metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "网络或数据库请求异常";
}

function hashText(value: string) {
  return Array.from(value).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function makeManualPostMeta(body: string): StructuredMeta {
  return {
    category: unifiedCategory,
    tags: [],
    summary: body.trim() ? "公开生活流消息" : "公开生活流",
  };
}

function mapSupabasePost(row: LifePostRow): FeedPost {
  const createdAtMs = row.created_at
    ? new Date(row.created_at).getTime()
    : Date.now();

  return {
    id: String(row.id),
    author: row.author_name ?? "匿名用户",
    handle: row.author_handle ?? "@sg",
    avatar: (row.author_name ?? "匿").slice(0, 1),
    body: row.body,
    imagePath: row.image_path ?? undefined,
    imageUrl: row.image_path ? getPublicImageUrl(row.image_path) : undefined,
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

function isRecentPost(post: FeedPost, nowMs: number) {
  return post.createdAtMs >= nowMs - recentFeedWindowMs;
}

function makePostImagePath(file: File, createdAtMs: number) {
  const extension = getImageExtension(file);
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `public/${createdAtMs}-${randomPart}.${extension}`;
}

function getImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]+$/.test(extension)) return extension;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";

  return "jpg";
}

function getPublicImageUrl(path: string) {
  const supabase = createClient();

  if (!supabase) return undefined;

  return supabase.storage.from(postImagesBucket).getPublicUrl(path).data.publicUrl;
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
