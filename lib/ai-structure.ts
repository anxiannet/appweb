import type { StructuredMeta } from "@/lib/types";

const channelRules: Array<[StructuredMeta["category"], RegExp]> = [
  ["租房", /租|房|室友|公寓|condo|hdb|主人房|普通房|预算/i],
  ["二手", /转卖|出|闲置|二手|桌|椅|床|冰箱|显示器|宜家|ikea/i],
  ["拼车", /拼车|顺风|打车|taxi|grab|jb|新山|机场/i],
  ["美食", /吃|餐厅|美食|咖啡|奶茶|火锅|牙医|诊所|推荐/i],
  ["避雷", /避雷|靠谱吗|骗子|坑|中介|投诉|小心|被骗/i],
  ["找搭子", /搭子|一起|有人吗|约|球|健身|自习|看房/i],
  ["活动", /活动|今晚|周末|演出|展|讲座|报名|票/i],
  ["求职", /求职|内推|招聘|工作|part.?time|实习|简历|面试/i],
];

const districts = [
  "Jurong East",
  "Clementi",
  "Tampines",
  "Paya Lebar",
  "Bugis",
  "Woodlands",
  "Yishun",
  "Bishan",
  "Orchard",
  "Chinatown",
  "Queenstown",
  "Serangoon",
  "Toa Payoh",
  "Ang Mo Kio",
  "Punggol",
  "Hougang",
];

const schools = ["NUS", "NTU", "SMU", "SUTD", "SIM", "Kaplan", "PSB", "LASALLE"];

export function structurePost(input: string): StructuredMeta {
  const body = input.trim();
  const category =
    channelRules.find(([, rule]) => rule.test(body))?.[0] ?? "找搭子";
  const district = districts.find((item) => new RegExp(item, "i").test(body));
  const school = schools.find((item) => new RegExp(item, "i").test(body));
  const price = body.match(/(?:\$|sgd|预算)?\s*(\d{2,5})(?:\s*新币|\s*刀)?/i)?.[1];
  const time = body.match(/今晚|明天|今天|周末|下周|早上|下午|晚上|[0-9]{1,2}点/)?.[0];
  const place = body.match(/JB|新山|机场|樟宜|市区|牛车水|乌节|金沙/i)?.[0];

  const tags = Array.from(
    new Set(
      [
        body.includes("求") ? "求助" : undefined,
        body.includes("推荐") ? "推荐" : undefined,
        body.includes("转卖") || body.includes("出") ? "转卖" : undefined,
        body.includes("预算") || price ? "价格明确" : undefined,
        school,
        district,
      ].filter(Boolean) as string[],
    ),
  ).slice(0, 4);

  return {
    category,
    district,
    school,
    price: price ? `S$${price}` : undefined,
    time,
    place,
    tags: tags.length ? tags : [category],
    summary: makeSummary(category, district ?? school ?? place, price, time),
  };
}

function makeSummary(
  category: StructuredMeta["category"],
  location?: string,
  price?: string,
  time?: string,
) {
  const parts = [category, location, price ? `S$${price}` : undefined, time].filter(Boolean);
  return parts.length > 1 ? parts.join(" · ") : `${category}相关生活信息`;
}
