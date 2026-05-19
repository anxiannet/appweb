export type Channel =
  | "全部"
  | "租房"
  | "二手"
  | "拼车"
  | "美食"
  | "避雷"
  | "找搭子"
  | "活动"
  | "求职";

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
  body: string;
  createdAt: string;
  replies: number;
  meta: StructuredMeta;
};
