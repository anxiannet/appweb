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
  Sticker,
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
const stickerColumns = 5;
const stickerRows = 4;
const stickerSheetWidth = 1500;
const stickerSheetHeight = 1000;

const stickerPacks = [
  {
    id: "life",
    label: "生活",
    sheetPath: "/stickers/sg-life-stickers.png",
    stickers: [
      { id: "milk-tea", label: "请喝奶茶", column: 0, row: 0 },
      { id: "eat", label: "请吃饭啦", column: 1, row: 0 },
      { id: "hard-work", label: "辛苦啦", column: 2, row: 0 },
      { id: "house-luck", label: "找房好运", column: 3, row: 0 },
      { id: "pr", label: "恭喜上岸", column: 4, row: 0 },
      { id: "hot", label: "神帖！", column: 0, row: 1 },
      { id: "helpful", label: "很有帮助", column: 1, row: 1 },
      { id: "save-me", label: "救我一命", column: 2, row: 1 },
      { id: "hug", label: "抱抱你", column: 3, row: 1 },
      { id: "good-night", label: "晚安啦", column: 4, row: 1 },
      { id: "student-life", label: "留子日常", column: 0, row: 2 },
      { id: "wallet", label: "钱包流泪", column: 1, row: 2 },
      { id: "avoid", label: "避雷！", column: 2, row: 2 },
      { id: "peek", label: "吃瓜中", column: 3, row: 2 },
      { id: "finals", label: "期末加油", column: 4, row: 2 },
      { id: "graduated", label: "上岸啦！", column: 0, row: 3 },
      { id: "rain", label: "坡县下雨了", column: 1, row: 3 },
      { id: "mosquito", label: "被蚊子咬了", column: 2, row: 3 },
      { id: "mrt", label: "地铁又坏了", column: 3, row: 3 },
      { id: "sg-verified", label: "新加坡认证", column: 4, row: 3 },
    ],
  },
  {
    id: "reactions",
    label: "本地",
    sheetPath: "/stickers/sg-local-reactions.png",
    stickers: [
      { id: "great", label: "太棒了", column: 0, row: 0 },
      { id: "moved", label: "感动到哭", column: 1, row: 0 },
      { id: "wow", label: "哇塞", column: 2, row: 0 },
      { id: "got-it", label: "懂了懂了", column: 3, row: 0 },
      { id: "explain-please", label: "求科普", column: 4, row: 0 },
      { id: "come-see", label: "快来看", column: 0, row: 1 },
      { id: "warm", label: "暖心", column: 1, row: 1 },
      { id: "cheer-up", label: "加油鸭", column: 2, row: 1 },
      { id: "please", label: "拜托了", column: 3, row: 1 },
      { id: "excited", label: "期待住了", column: 4, row: 1 },
      { id: "hug-cat", label: "抱抱", column: 0, row: 2 },
      { id: "waiting-bus", label: "等车中", column: 1, row: 2 },
      { id: "check-in", label: "打卡成功", column: 2, row: 2 },
      { id: "want-food", label: "想吃这个", column: 3, row: 2 },
      { id: "money-gone", label: "钱飞走了", column: 4, row: 2 },
      { id: "bad-weather", label: "天气好差", column: 0, row: 3 },
      { id: "many-mosquitoes", label: "蚊子好多", column: 1, row: 3 },
      { id: "crossing", label: "过关中", column: 2, row: 3 },
      { id: "to-jb", label: "去JB咯", column: 3, row: 3 },
      { id: "just-saw", label: "刚刚看到", column: 4, row: 3 },
    ],
  },
  {
    id: "daily",
    label: "日常",
    sheetPath: "/stickers/sg-daily-reactions.png",
    stickers: [
      { id: "nice", label: "太赞了", column: 0, row: 0 },
      { id: "thanks-share", label: "谢谢分享", column: 1, row: 0 },
      { id: "really", label: "真的吗", column: 2, row: 0 },
      { id: "understood", label: "明白了", column: 3, row: 0 },
      { id: "question", label: "有问题", column: 4, row: 0 },
      { id: "bump", label: "顶起来", column: 0, row: 1 },
      { id: "love-it", label: "爱了爱了", column: 1, row: 1 },
      { id: "go", label: "冲鸭！", column: 2, row: 1 },
      { id: "too-hard", label: "太难了", column: 3, row: 1 },
      { id: "lol", label: "笑死我了", column: 4, row: 1 },
      { id: "screenshot", label: "已截图", column: 0, row: 2 },
      { id: "carpool", label: "拼车滴滴", column: 1, row: 2 },
      { id: "tea-time", label: "下午茶走起", column: 2, row: 2 },
      { id: "meal-online", label: "干饭人上线", column: 3, row: 2 },
      { id: "buy-buy-buy", label: "买买买", column: 4, row: 2 },
      { id: "low-battery", label: "电量不足", column: 0, row: 3 },
      { id: "working", label: "工作ing", column: 1, row: 3 },
      { id: "offer", label: "收到offer啦", column: 2, row: 3 },
      { id: "departure", label: "准备出发", column: 3, row: 3 },
      { id: "happy-trip", label: "旅行愉快", column: 4, row: 3 },
    ],
  },
  {
    id: "study",
    label: "留学",
    sheetPath: "/stickers/sg-study-stickers.png",
    stickers: [
      { id: "go-abroad", label: "准备出国啦", column: 0, row: 0 },
      { id: "studying", label: "努力学习中", column: 1, row: 0 },
      { id: "offer-received", label: "收到offer啦", column: 2, row: 0 },
      { id: "thrilled", label: "太激动了", column: 3, row: 0 },
      { id: "departing", label: "出发咯", column: 4, row: 0 },
      { id: "arrived-sg", label: "初到新加坡", column: 0, row: 1 },
      { id: "confused", label: "一脸懵逼", column: 1, row: 1 },
      { id: "student-pass", label: "学生证get", column: 2, row: 1 },
      { id: "all-nighter", label: "熬夜赶due", column: 3, row: 1 },
      { id: "study-pressure", label: "压力山大", column: 4, row: 1 },
      { id: "exam-done", label: "考试考完啦", column: 0, row: 2 },
      { id: "happy-meal", label: "干饭最快乐", column: 1, row: 2 },
      { id: "commute-life", label: "通勤日常", column: 2, row: 2 },
      { id: "new-friends", label: "认识新朋友", column: 3, row: 2 },
      { id: "writing-essay", label: "写essay中", column: 4, row: 2 },
      { id: "miss-family", label: "想念家人", column: 0, row: 3 },
      { id: "life-helper", label: "生活小能手", column: 1, row: 3 },
      { id: "weekend-fun", label: "周末去玩啦", column: 2, row: 3 },
      { id: "graduated", label: "顺利毕业啦", column: 3, row: 3 },
      { id: "future", label: "未来可期", column: 4, row: 3 },
    ],
  },
  {
    id: "work",
    label: "打工",
    sheetPath: "/stickers/sg-work-stickers.png",
    stickers: [
      { id: "worker-cheer", label: "打工人加油", column: 0, row: 0 },
      { id: "start-work", label: "开始搬砖", column: 1, row: 0 },
      { id: "deadline", label: "赶工中...", column: 2, row: 0 },
      { id: "done-work", label: "搞定收工", column: 3, row: 0 },
      { id: "off-work", label: "下班啦", column: 4, row: 0 },
      { id: "working-shift", label: "打工进行时", column: 0, row: 1 },
      { id: "focused-work", label: "认真工作中", column: 1, row: 1 },
      { id: "taking-orders", label: "接单中", column: 2, row: 1 },
      { id: "busy", label: "忙碌中", column: 3, row: 1 },
      { id: "serving", label: "服务中", column: 4, row: 1 },
      { id: "big-head", label: "头大..", column: 0, row: 2 },
      { id: "tired", label: "好累啊", column: 1, row: 2 },
      { id: "overtime", label: "加班中", column: 2, row: 2 },
      { id: "payday", label: "发工资啦", column: 3, row: 2 },
      { id: "reward", label: "努力有回报", column: 4, row: 2 },
      { id: "thin-wallet", label: "钱包好瘦", column: 0, row: 3 },
      { id: "quick-meal", label: "随便解决一餐", column: 1, row: 3 },
      { id: "scheduled", label: "排班中", column: 2, row: 3 },
      { id: "on-commute", label: "通勤路上", column: 3, row: 3 },
      { id: "sleep-early", label: "早睡养生", column: 4, row: 3 },
    ],
  },
  {
    id: "housing",
    label: "找房",
    sheetPath: "/stickers/sg-housing-stickers.png",
    stickers: [
      { id: "house-luck", label: "找房好运", column: 0, row: 0 },
      { id: "searching-house", label: "正在找房", column: 1, row: 0 },
      { id: "lead-received", label: "收到房源啦", column: 2, row: 0 },
      { id: "heart-house", label: "这个好心动", column: 3, row: 0 },
      { id: "negotiate-price", label: "价格可以再谈吗", column: 4, row: 0 },
      { id: "viewing-appointment", label: "约看房", column: 0, row: 1 },
      { id: "viewing", label: "去看房啦", column: 1, row: 1 },
      { id: "satisfied", label: "房子很满意", column: 2, row: 1 },
      { id: "reserved", label: "拿下啦", column: 3, row: 1 },
      { id: "landed", label: "成功上岸", column: 4, row: 1 },
      { id: "over-budget", label: "预算超了", column: 0, row: 2 },
      { id: "wallet-cannot", label: "钱包扛不住", column: 1, row: 2 },
      { id: "rented-out", label: "房子已租", column: 2, row: 2 },
      { id: "no-agent", label: "不考虑中介", column: 3, row: 2 },
      { id: "recommend-house", label: "求推荐房源", column: 4, row: 2 },
      { id: "roommate", label: "求室友", column: 0, row: 3 },
      { id: "moving", label: "准备搬家", column: 1, row: 3 },
      { id: "contract", label: "签合同啦", column: 2, row: 3 },
      { id: "leaking", label: "漏水了", column: 3, row: 3 },
      { id: "landlord-no-reply", label: "房东不回复", column: 4, row: 3 },
    ],
  },
  {
    id: "food",
    label: "干饭",
    sheetPath: "/stickers/sg-food-stickers.png",
    stickers: [
      { id: "meal-time", label: "开饭啦", column: 0, row: 0 },
      { id: "too-delicious", label: "好吃到飞起", column: 1, row: 0 },
      { id: "thanks-treat", label: "感谢投喂", column: 2, row: 0 },
      { id: "amazing-food", label: "绝绝子！", column: 3, row: 0 },
      { id: "praise", label: "赞赞赞", column: 4, row: 0 },
      { id: "tea-time", label: "下午茶走起", column: 0, row: 1 },
      { id: "milk-tea-life", label: "奶茶续命", column: 1, row: 1 },
      { id: "hotpot", label: "火锅最棒了", column: 2, row: 1 },
      { id: "too-spicy", label: "太辣了啦", column: 3, row: 1 },
      { id: "local-food", label: "本地美食yyds", column: 4, row: 1 },
      { id: "photo-first", label: "先拍照再吃", column: 0, row: 2 },
      { id: "happy-food", label: "好幸福呀", column: 1, row: 2 },
      { id: "one-more-bowl", label: "再来一碗！", column: 2, row: 2 },
      { id: "light-food", label: "清淡最舒服", column: 3, row: 2 },
      { id: "takeaway", label: "打包带走", column: 4, row: 2 },
      { id: "seafood-feast", label: "海鲜大餐", column: 0, row: 3 },
      { id: "kaya-breakfast", label: "咖椰早餐", column: 1, row: 3 },
      { id: "drink-together", label: "一起干杯", column: 2, row: 3 },
      { id: "meal-online", label: "干饭人上线", column: 3, row: 3 },
      { id: "full", label: "吃饱饱啦", column: 4, row: 3 },
    ],
  },
  {
    id: "city",
    label: "新加坡",
    sheetPath: "/stickers/sg-city-stickers.png",
    stickers: [
      { id: "love-sg", label: "爱新加坡", column: 0, row: 0 },
      { id: "beautiful-view", label: "风景太美啦", column: 1, row: 0 },
      { id: "nets", label: "本地支付真方便", column: 2, row: 0 },
      { id: "weekend-shopping", label: "周末去逛街", column: 3, row: 0 },
      { id: "food-many", label: "美食太多啦", column: 4, row: 0 },
      { id: "transport", label: "出行超方便", column: 0, row: 1 },
      { id: "rent-good", label: "住组屋也很棒", column: 1, row: 1 },
      { id: "gov-service", label: "政府服务很贴心", column: 2, row: 1 },
      { id: "ezlink", label: "ezlink走天下", column: 3, row: 1 },
      { id: "changi", label: "樟宜机场yyds", column: 4, row: 1 },
      { id: "hawker", label: "食阁超赞！", column: 0, row: 2 },
      { id: "park-walk", label: "公园散步好舒服", column: 1, row: 2 },
      { id: "sg-weather", label: "坡县天气说变就变", column: 2, row: 2 },
      { id: "discounts", label: "各种优惠真香", column: 3, row: 2 },
      { id: "seven-eleven", label: "711永远滴神", column: 4, row: 2 },
      { id: "plants", label: "养花种草ing", column: 0, row: 3 },
      { id: "recycle", label: "垃圾分类从我做起", column: 1, row: 3 },
      { id: "cat-life", label: "猫奴日常", column: 2, row: 3 },
      { id: "check-in", label: "打卡成功！", column: 3, row: 3 },
      { id: "cozy-home", label: "最喜欢在家躺平", column: 4, row: 3 },
    ],
  },
  {
    id: "commute",
    label: "通勤",
    sheetPath: "/stickers/sg-commute-stickers.png",
    stickers: [
      { id: "leave-for-work", label: "出门上班啦", column: 0, row: 0 },
      { id: "coffee", label: "咖啡续命", column: 1, row: 0 },
      { id: "late", label: "快要迟到啦", column: 2, row: 0 },
      { id: "tap-in", label: "刷卡进站", column: 3, row: 0 },
      { id: "hold-tight", label: "抓紧扶手", column: 4, row: 0 },
      { id: "crowded-peak", label: "早高峰人挤人", column: 0, row: 1 },
      { id: "scroll-phone", label: "地铁上刷手机", column: 1, row: 1 },
      { id: "earphones", label: "耳机一戴", column: 2, row: 1 },
      { id: "nap", label: "小憩一下", column: 3, row: 1 },
      { id: "route-check", label: "看线路中", column: 4, row: 1 },
      { id: "view", label: "看看风景", column: 0, row: 2 },
      { id: "waiting-bus", label: "等巴士中", column: 1, row: 2 },
      { id: "rain", label: "突然下雨了", column: 2, row: 2 },
      { id: "sardine", label: "被挤成沙丁鱼", column: 3, row: 2 },
      { id: "arrived-office", label: "到公司啦", column: 4, row: 2 },
      { id: "want-off-work", label: "想快点下班", column: 0, row: 3 },
      { id: "happy-commute", label: "通勤也要开心", column: 1, row: 3 },
      { id: "catch-train", label: "刚好赶上车", column: 2, row: 3 },
      { id: "ten-k-steps", label: "今天又破万步", column: 3, row: 3 },
      { id: "hard-day", label: "辛苦一天啦", column: 4, row: 3 },
    ],
  },
  {
    id: "travel",
    label: "旅行",
    sheetPath: "/stickers/sg-travel-stickers.png",
    stickers: [
      { id: "come-sg", label: "来新加坡啦", column: 0, row: 0 },
      { id: "planning", label: "做攻略中", column: 1, row: 0 },
      { id: "departing", label: "出发咯", column: 2, row: 0 },
      { id: "beautiful", label: "哇 太美了！", column: 3, row: 0 },
      { id: "photo-checkin", label: "拍照打卡ing", column: 4, row: 0 },
      { id: "beach", label: "海边走起", column: 0, row: 1 },
      { id: "food-hunt", label: "美食探店", column: 1, row: 1 },
      { id: "shopping", label: "买买买", column: 2, row: 1 },
      { id: "explore", label: "探索景点", column: 3, row: 1 },
      { id: "sunset", label: "看日落啦", column: 4, row: 1 },
      { id: "night-view", label: "夜景太赞了", column: 0, row: 2 },
      { id: "uss", label: "环球影城嗨翻天", column: 1, row: 2 },
      { id: "cable-car", label: "坐缆车看风景", column: 2, row: 2 },
      { id: "moment", label: "记录美好瞬间", column: 3, row: 2 },
      { id: "vacation", label: "度假模式ON", column: 4, row: 2 },
      { id: "zoo", label: "动物园好可爱", column: 0, row: 3 },
      { id: "go-home", label: "准备回国啦", column: 1, row: 3 },
      { id: "full-luggage", label: "行李满满", column: 2, row: 3 },
      { id: "next-trip", label: "期待下次旅行", column: 3, row: 3 },
      { id: "memories", label: "回忆满满", column: 4, row: 3 },
    ],
  },
  {
    id: "weijie",
    label: "维界",
    sheetPath: "/stickers/weijie-world-stickers.png",
    stickers: [
      { id: "welcome", label: "欢迎来到维界", column: 0, row: 0 },
      { id: "explore", label: "探索无限维度", column: 1, row: 0 },
      { id: "encyclopedia", label: "维界百科全书", column: 2, row: 0 },
      { id: "ideas-world", label: "每个想法都是世界", column: 3, row: 0 },
      { id: "portal", label: "穿梭不同维度", column: 4, row: 0 },
      { id: "partner", label: "维界伙伴相伴", column: 0, row: 1 },
      { id: "guardian", label: "成为维界守护者", column: 1, row: 1 },
      { id: "create-world", label: "创造属于你的世界", column: 2, row: 1 },
      { id: "build-all", label: "万物皆可构建", column: 3, row: 1 },
      { id: "bgm", label: "维界BGM启动", column: 4, row: 1 },
      { id: "choose-dimension", label: "选择你的维度", column: 0, row: 2 },
      { id: "network", label: "连接维界网络", column: 1, row: 2 },
      { id: "inner-expand", label: "内观即是扩展", column: 2, row: 2 },
      { id: "inner-energy", label: "能量源自内心", column: 3, row: 2 },
      { id: "unlock-world", label: "不断解锁新世界", column: 4, row: 2 },
      { id: "same-frequency", label: "在维界遇见同频的你", column: 0, row: 3 },
      { id: "plant-idea", label: "种下想法，收获世界", column: 1, row: 3 },
      { id: "mirror", label: "镜像映照本心", column: 2, row: 3 },
      { id: "co-create", label: "共创·共建·共享", column: 3, row: 3 },
      { id: "next-stop", label: "下一站，维界更远处", column: 4, row: 3 },
    ],
  },
  {
    id: "resonance",
    label: "共振",
    sheetPath: "/stickers/weijie-resonance-stickers.png",
    stickers: [
      { id: "detected", label: "检测到共振", column: 0, row: 0 },
      { id: "connected", label: "连接已建立", column: 1, row: 0 },
      { id: "dimension-up", label: "维度提升", column: 2, row: 0 },
      { id: "sync-success", label: "同步成功", column: 3, row: 0 },
      { id: "node-online", label: "高维节点在线", column: 4, row: 0 },
      { id: "medium-generated", label: "界质产生", column: 0, row: 1 },
      { id: "connection-stable", label: "连接稳定中", column: 1, row: 1 },
      { id: "reality-stable", label: "现实结构稳定", column: 2, row: 1 },
      { id: "anchor-built", label: "维锚已建立", column: 3, row: 1 },
      { id: "dimension-syncing", label: "维度同步中", column: 4, row: 1 },
      { id: "calibrating", label: "正在校准维度", column: 0, row: 2 },
      { id: "signal-syncing", label: "信号同步中", column: 1, row: 2 },
      { id: "crossing", label: "正在穿越边界", column: 2, row: 2 },
      { id: "emotion-synced", label: "情绪同步成功", column: 3, row: 2 },
      { id: "reality-rift", label: "检测到现实裂缝", column: 4, row: 2 },
      { id: "path-opened", label: "路径已展开", column: 0, row: 3 },
      { id: "entered-weijie", label: "已进入维界", column: 1, row: 3 },
      { id: "medium-stable", label: "界质稳定中", column: 2, row: 3 },
      { id: "cognition-up", label: "认知层级提升", column: 3, row: 3 },
      { id: "migration-recorded", label: "已记录维度迁移", column: 4, row: 3 },
    ],
  },
  {
    id: "agent",
    label: "节点",
    sheetPath: "/stickers/weijie-agent-stickers.png",
    stickers: [
      { id: "medium-refill", label: "界质补充", column: 0, row: 0 },
      { id: "resonance-detected", label: "检测到共振", column: 1, row: 0 },
      { id: "low-dimensional-sleep", label: "低维休眠", column: 2, row: 0 },
      { id: "high-resonance", label: "高共鸣", column: 3, row: 0 },
      { id: "dimension-sync", label: "维度同步", column: 4, row: 0 },
      { id: "connecting", label: "正在连接", column: 0, row: 1 },
      { id: "cognition-up", label: "认知提升", column: 1, row: 1 },
      { id: "stable-reality", label: "稳定现实", column: 2, row: 1 },
      { id: "anchor-issue", label: "发现维锚", column: 3, row: 1 },
      { id: "rift-warning", label: "裂界警告", column: 4, row: 1 },
      { id: "observing", label: "高维观察中", column: 0, row: 2 },
      { id: "route-analysis", label: "路径解析", column: 1, row: 2 },
      { id: "upgrade-done", label: "完成升维", column: 2, row: 2 },
      { id: "medium-low", label: "界质不足", column: 3, row: 2 },
      { id: "reality-wave", label: "现实波动", column: 4, row: 2 },
      { id: "emotion-noise", label: "情绪噪声", column: 0, row: 3 },
      { id: "bio-attack", label: "低维生物攻击", column: 1, row: 3 },
      { id: "dimension-break", label: "维度突破", column: 2, row: 3 },
      { id: "cognition-pollution", label: "认知污染", column: 3, row: 3 },
      { id: "sg-node", label: "新加坡节点", column: 4, row: 3 },
    ],
  },
  {
    id: "helper",
    label: "助手",
    sheetPath: "/stickers/weijie-helper-stickers.png",
    stickers: [
      { id: "hello", label: "你好呀", column: 0, row: 0 },
      { id: "received", label: "收到！", column: 1, row: 0 },
      { id: "question", label: "有问题~", column: 2, row: 0 },
      { id: "like", label: "赞！", column: 3, row: 0 },
      { id: "thanks", label: "感谢~", column: 4, row: 0 },
      { id: "notice", label: "重要通知", column: 0, row: 1 },
      { id: "are-you-there", label: "在吗？", column: 1, row: 1 },
      { id: "working-hard", label: "努力中...", column: 2, row: 1 },
      { id: "great", label: "太棒啦！", column: 3, row: 1 },
      { id: "depart", label: "出发咯~", column: 4, row: 1 },
      { id: "meal", label: "干饭啦！", column: 0, row: 2 },
      { id: "milk-tea", label: "喝杯奶茶~", column: 1, row: 2 },
      { id: "rest", label: "休息一下", column: 2, row: 2 },
      { id: "rain", label: "下雨啦", column: 3, row: 2 },
      { id: "good-night", label: "晚安~", column: 4, row: 2 },
      { id: "too-hard", label: "我太难了", column: 0, row: 3 },
      { id: "wow", label: "哇哦！", column: 1, row: 3 },
      { id: "routing", label: "找路线中", column: 2, row: 3 },
      { id: "let-me-see", label: "我找看...", column: 3, row: 3 },
      { id: "see-you", label: "下次见~", column: 4, row: 3 },
    ],
  },
] as const;

const stickers = stickerPacks.flatMap((pack) =>
  pack.stickers.map((sticker) => ({
    ...sticker,
    packId: pack.id,
    sheetPath: pack.sheetPath,
  })),
);

type StickerPackId = (typeof stickerPacks)[number]["id"];
type StickerItem = (typeof stickers)[number];

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
  const [stickerOpen, setStickerOpen] = useState(false);
  const [activeStickerPackId, setActiveStickerPackId] =
    useState<StickerPackId>("life");
  const [pendingSticker, setPendingSticker] = useState<StickerItem | null>(null);
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
  const stickerScrollerRef = useRef<HTMLDivElement>(null);

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
  const activeStickerPack =
    stickerPacks.find((pack) => pack.id === activeStickerPackId) ??
    stickerPacks[0];

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: "end" });
  }, [displayedPosts.length, search]);

  function scrollToStickerPack(packId: StickerPackId) {
    const packIndex = stickerPacks.findIndex((pack) => pack.id === packId);
    const scroller = stickerScrollerRef.current;

    setActiveStickerPackId(packId);
    if (!scroller || packIndex < 0) return;

    scroller.scrollTo({
      left: scroller.clientWidth * packIndex,
      behavior: "smooth",
    });
  }

  function updateActiveStickerPackFromScroll() {
    const scroller = stickerScrollerRef.current;
    if (!scroller || scroller.clientWidth === 0) return;

    const packIndex = Math.min(
      stickerPacks.length - 1,
      Math.max(0, Math.round(scroller.scrollLeft / scroller.clientWidth)),
    );
    const nextPack = stickerPacks[packIndex];
    if (nextPack && nextPack.id !== activeStickerPackId) {
      setActiveStickerPackId(nextPack.id);
    }
  }

  function publishLocalPost(post: FeedPost, message: ComposerMessage) {
    setPosts((current) =>
      current.some((item) => item.id === post.id) ? current : [post, ...current],
    );
    setDraft("");
    setStickerOpen(false);
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
    const createdAtMs = new Date().getTime();
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
      setStickerOpen(false);
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

    const createdAtMs = new Date().getTime();
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
      setStickerOpen(false);
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

  async function publishSticker(sticker: StickerItem, skipTermsCheck = false) {
    if (isPublishing) return;

    if (!skipTermsCheck && !hasAcceptedTerms) {
      setPendingSticker(sticker);
      setTermsOpen(true);
      setComposerMessage({
        tone: "quiet",
        text: "请先阅读并同意使用条款，再发送表情包。",
      });
      return;
    }

    const createdAtMs = new Date().getTime();
    const identity = user
      ? getSignedInUserIdentity(user)
      : (anonymousIdentity ?? getAnonymousVisitorIdentity());
    const post: FeedPost = {
      id: `local-sticker-${createdAtMs}`,
      author: identity.author,
      handle: identity.handle,
      avatar: identity.avatar,
      body: "",
      imagePath: makeStickerPath(sticker),
      imageUrl: makeStickerPath(sticker),
      createdAt: "刚刚",
      createdAtMs,
      replies: 0,
      meta: {
        category: unifiedCategory,
        tags: ["表情包", sticker.label],
        summary: sticker.label,
      },
    };

    if (!supabase) {
      publishLocalPost(post, {
        tone: "quiet",
        text: "当前是演示模式，表情包只会显示在你自己的浏览器里。",
      });
      setComposerMessage(null);
      return;
    }

    setIsPublishing(true);
    setComposerMessage({ tone: "quiet", text: "正在发送表情包..." });

    try {
      const { data, error } = await publishRemotePost(post);

      if (error) {
        publishLocalPost(post, {
          tone: "quiet",
          text: `表情包已显示在本地，暂时没有同步到实时数据库：${error.message}`,
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
      setStickerOpen(false);
      markVisitorHasPublishedPost();
      setHasPublishedPost(true);
      setComposerMessage(null);
      composerRef.current?.focus();
    } catch (error) {
      publishLocalPost(post, {
        tone: "quiet",
        text: `表情包已显示在本地，暂时没有同步到实时数据库：${getErrorMessage(error)}`,
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
              type="button"
              onClick={() => setStickerOpen((current) => !current)}
              disabled={isPublishing}
              className={`mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/8 shadow-bubble ${
                stickerOpen ? "bg-leaf text-white" : "bg-white text-black/55"
              }`}
              aria-label="表情包"
              title="表情包"
            >
              <Sticker size={18} />
            </button>
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

          {stickerOpen ? (
            <div className="mt-2 rounded-[1.35rem] border border-black/8 bg-white/96 p-2 shadow-bubble">
              <div className="no-scrollbar mb-2 flex gap-1 overflow-x-auto rounded-full bg-black/[0.04] p-1">
                {stickerPacks.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => scrollToStickerPack(pack.id)}
                    className={`h-7 shrink-0 rounded-full px-3 text-xs font-medium transition ${
                      activeStickerPack.id === pack.id
                        ? "bg-white text-leaf shadow-bubble"
                        : "text-black/45"
                    }`}
                    aria-pressed={activeStickerPack.id === pack.id}
                  >
                    {pack.label}
                  </button>
                ))}
              </div>
              <div
                ref={stickerScrollerRef}
                onScroll={updateActiveStickerPackFromScroll}
                className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
              >
                {stickerPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="grid min-w-full shrink-0 snap-start grid-cols-5 gap-1.5"
                  >
                    {stickers
                      .filter((sticker) => sticker.packId === pack.id)
                      .map((sticker) => (
                        <button
                          key={`${sticker.packId}-${sticker.id}`}
                          type="button"
                          onClick={() => {
                            void publishSticker(sticker);
                          }}
                          disabled={isPublishing}
                          className="aspect-[6/5] rounded-lg border border-transparent bg-[#fffaf2] p-1 transition hover:border-coral/35 disabled:opacity-55"
                          aria-label={`发送表情包：${sticker.label}`}
                          title={sticker.label}
                        >
                          <StickerSprite sticker={sticker} size="picker" />
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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
            if (pendingSticker) {
              const sticker = pendingSticker;
              setPendingSticker(null);
              window.setTimeout(() => {
                void publishSticker(sticker, true);
              }, 0);
              return;
            }

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
  const sticker = post.imagePath ? getStickerFromPath(post.imagePath) : null;

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
        {sticker ? (
          <div className={post.body ? "mb-2" : ""}>
            <StickerSprite sticker={sticker} size="message" />
          </div>
        ) : post.imageUrl ? (
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

function StickerSprite({
  sticker,
  size,
}: {
  sticker: StickerItem;
  size: "message" | "picker";
}) {
  return (
    <span
      className={`relative block overflow-hidden ${
        size === "message"
          ? "h-40 w-48 max-w-[68vw] rounded-lg"
          : "h-full w-full rounded-md"
      }`}
      role="img"
      aria-label={sticker.label}
    >
      <Image
        src={sticker.sheetPath}
        alt=""
        aria-hidden
        draggable={false}
        width={stickerSheetWidth}
        height={stickerSheetHeight}
        unoptimized
        className="absolute left-0 top-0 max-w-none select-none"
        style={{
          width: `${stickerColumns * 100}%`,
          height: `${stickerRows * 100}%`,
          transform: `translate(-${sticker.column * 20}%, -${
            sticker.row * 25
          }%)`,
        }}
      />
    </span>
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

function makeStickerPath(sticker: StickerItem) {
  return `${sticker.sheetPath}#${sticker.id}`;
}

function getStickerFromPath(path: string) {
  const [sheetPath, stickerId] = path.split("#");
  if (!sheetPath || !stickerId) return null;

  return (
    stickers.find(
      (sticker) => sticker.sheetPath === sheetPath && sticker.id === stickerId,
    ) ?? null
  );
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
  if (path.startsWith("/")) return path;

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
