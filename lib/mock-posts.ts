import { structurePost } from "@/lib/ai-structure";
import type { FeedPost } from "@/lib/types";

const rawPosts = [
  ["3分钟前", "阿琳", "alynn", "NTU附近求租，预算1200，女生，六月底入住，有房源麻烦丢一下"],
  ["7分钟前", "老陈", "chen", "今晚有人拼车去JB吗？我这边两个人，Jurong East出发"],
  ["12分钟前", "Mavis", "mavis", "转卖宜家桌子，Clementi自取，20刀，桌面有一点点划痕"],
  ["18分钟前", "周同学", "zhou", "求推荐Jurong East牙医，最好能讲中文，不要太贵"],
  ["26分钟前", "匿名用户", "anon", "这个中介靠谱吗？说看房前要先转押金，有点慌"],
  ["34分钟前", "Kai", "kai", "周末有人一起去Paya Lebar打羽毛球吗，缺两个人"],
  ["48分钟前", "Rita", "rita", "公司招part-time admin，一周三天，地点Bugis，适合学生"],
  ["1小时前", "小郑", "zheng", "Tampines附近有没有靠谱修空调师傅，房东一直拖"],
];

const relativeMinutes: Record<string, number> = {
  "3分钟前": 3,
  "7分钟前": 7,
  "12分钟前": 12,
  "18分钟前": 18,
  "26分钟前": 26,
  "34分钟前": 34,
  "48分钟前": 48,
  "1小时前": 60,
};

export const seedPosts: FeedPost[] = rawPosts.map(([createdAt, author, handle, body], index) => ({
  id: `seed-${index}`,
  author,
  handle: `@${handle}`,
  avatar: author.slice(0, 1),
  body,
  createdAt,
  createdAtMs: Date.now() - (relativeMinutes[createdAt] ?? 0) * 60_000,
  replies: [4, 2, 1, 6, 9, 3, 5, 2][index],
  meta: structurePost(body),
}));
