export type Channel =
  | "全部"
  | "租房"
  | "二手"
  | "拼车"
  | "美食"
  | "避雷"
  | "找搭子"
  | "活动"
  | "求职"
  | "热点";

export type StructuredMeta = {
  category: Exclude<Channel, "全部">;
  district?: string;
  school?: string;
  price?: string;
  time?: string;
  place?: string;
  tags: string[];
  summary: string;
};

export type FeedPost = {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  avatarPoolIndex?: number;
  avatarUrl?: string;
  body: string;
  imagePath?: string;
  imageUrl?: string;
  sourceUrls?: string[];
  botId?: string;
  status?: "published" | "draft";
  createdAt: string;
  createdAtMs: number;
  replies: number;
  meta: StructuredMeta;
};
