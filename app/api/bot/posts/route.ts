import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type BotPostRequest = {
  bot_id?: string;
  title?: string;
  body?: string;
  summary?: string;
  category?: string;
  tags?: string[];
  source_urls?: string[];
  publish_slot?: string;
  published_at?: string;
  status?: "published" | "draft";
  idempotency_key?: string;
};

const allowedSlots = new Set(["morning", "noon", "evening", "test"]);
const vvBotAvatarUrl = "/avatars/vv-bot.png";

export async function POST(request: Request) {
  const expectedToken = process.env.VV_BOT_API_TOKEN;
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase service credentials are not configured" },
      { status: 500 },
    );
  }

  const payload = (await request.json().catch(() => null)) as BotPostRequest | null;
  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const idempotencyKey = payload!.idempotency_key!;
  const { data: existing, error: existingError } = await supabase
    .from("life_posts")
    .select("id,status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({
      ok: true,
      post_id: existing.id,
      url: `https://app.weijie.sg/#post-${existing.id}`,
      status: existing.status,
    });
  }

  const { data, error } = await supabase
    .from("life_posts")
    .insert({
      body: payload!.body!,
      author_id: null,
      author_name: "vv",
      author_handle: "@vv",
      author_avatar_index: null,
      author_avatar_url: vvBotAvatarUrl,
      category: "热点",
      tags: payload!.tags ?? ["vv整理", "AI整理", "新加坡"],
      ai_summary: payload!.summary!,
      source_urls: payload!.source_urls!,
      bot_id: "vv",
      idempotency_key: idempotencyKey,
      status: payload!.status ?? "published",
      time_hint: payload!.publish_slot,
    })
    .select("id,status")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    post_id: data.id,
    url: `https://app.weijie.sg/#post-${data.id}`,
    status: data.status,
  });
}

function validatePayload(payload: BotPostRequest | null) {
  if (!payload) return "Invalid JSON body";
  if (payload.bot_id !== "vv") return "bot_id must be vv";
  if (!payload.body || payload.body.length > 2000) return "body is required and must be 2000 characters or fewer";
  if (!payload.summary || payload.summary.length > 240) return "summary is required and must be 240 characters or fewer";
  if (!Array.isArray(payload.source_urls) || payload.source_urls.length === 0) return "source_urls must be a non-empty array";
  if (!payload.source_urls.every((url) => typeof url === "string" && /^https?:\/\//.test(url))) return "source_urls must contain HTTP URLs";
  if (!payload.idempotency_key || !/^vv-\d{4}-\d{2}-\d{2}-(morning|noon|evening|test)(?:-[a-z0-9]+)*$/.test(payload.idempotency_key)) {
    return "idempotency_key is invalid";
  }
  if (!payload.publish_slot || !allowedSlots.has(payload.publish_slot)) return "publish_slot is invalid";
  if (payload.status && !["published", "draft"].includes(payload.status)) return "status is invalid";
  return null;
}
