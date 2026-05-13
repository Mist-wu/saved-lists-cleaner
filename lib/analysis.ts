import { z } from "zod";
import type { ZhihuCollectionItem } from "./zhihu";

export const actionLabels = {
  delete: "建议删除",
  skim: "建议速读",
  deep_read: "值得精读",
  outdated: "内容过时",
  duplicate: "疑似重复",
  keep: "保留",
} as const;

export type ItemAction = keyof typeof actionLabels;

export type ItemAnalysis = {
  platformItemId: string;
  action: ItemAction;
  tags: string[];
  reason: string;
  summary: string;
  readMinutes: number;
  qualityScore: number;
  duplicateKey: string;
};

const itemAnalysisSchema = z.object({
  platformItemId: z.string(),
  action: z.enum(["delete", "skim", "deep_read", "outdated", "duplicate", "keep"]),
  tags: z.array(z.string()).default([]),
  reason: z.string(),
  summary: z.string(),
  readMinutes: z.number().int().min(1).max(60).default(5),
  qualityScore: z.number().int().min(0).max(100).default(50),
  duplicateKey: z.string().default(""),
});

const responseSchema = z.object({
  items: z.array(itemAnalysisSchema),
});

export async function analyzeItems(items: ZhihuCollectionItem[]): Promise<ItemAnalysis[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return items.map(heuristicAnalyze);
  }

  const batches = chunk(items, 8);
  const results: ItemAnalysis[] = [];

  for (const batch of batches) {
    try {
      results.push(...(await analyzeBatch(batch, apiKey)));
    } catch (error) {
      console.error("DeepSeek analysis failed, using heuristic fallback:", error);
      results.push(...batch.map(heuristicAnalyze));
    }
  }

  return results;
}

export function buildRunSummary(analyses: ItemAnalysis[]) {
  const counts = countActions(analyses);
  const actionable =
    (counts.delete ?? 0) + (counts.outdated ?? 0) + (counts.duplicate ?? 0) + (counts.skim ?? 0);
  const highValue = (counts.deep_read ?? 0) + (counts.keep ?? 0);
  const deleteRatio = analyses.length ? Math.round(((counts.delete ?? 0) / analyses.length) * 100) : 0;
  const healthScore = analyses.length
    ? Math.max(8, Math.min(96, Math.round((highValue / analyses.length) * 100)))
    : 0;

  return {
    counts,
    healthScore,
    summary: `本次导入 ${analyses.length} 条，${actionable} 条可进入快速清理队列，${deleteRatio}% 可直接删除。`,
  };
}

function countActions(analyses: ItemAnalysis[]) {
  return analyses.reduce<Record<string, number>>((acc, item) => {
    acc[item.action] = (acc[item.action] ?? 0) + 1;
    return acc;
  }, {});
}

async function analyzeBatch(items: ZhihuCollectionItem[], apiKey: string): Promise<ItemAnalysis[]> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是收藏夹清债助手。只返回 JSON。不要推荐新内容，只判断用户旧收藏是否值得处理、速读、删除、保留或归为过时/重复。",
        },
        {
          role: "user",
          content: JSON.stringify({
            schema: {
              items: [
                {
                  platformItemId: "string",
                  action: "delete | skim | deep_read | outdated | duplicate | keep",
                  tags: ["string"],
                  reason: "一句话解释",
                  summary: "一句话摘要",
                  readMinutes: "1-60 integer",
                  qualityScore: "0-100 integer",
                  duplicateKey: "同主题去重键，没有则空字符串",
                },
              ],
            },
            items: items.map((item) => ({
              platformItemId: item.platformItemId,
              type: item.type,
              title: item.title,
              excerpt: item.excerpt.slice(0, 700),
              authorName: item.authorName,
              voteupCount: item.voteupCount,
              commentCount: item.commentCount,
              contentUpdatedAt: item.contentUpdatedAt?.toISOString() ?? null,
            })),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek returned ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = responseSchema.parse(JSON.parse(content));
  return parsed.items;
}

function heuristicAnalyze(item: ZhihuCollectionItem): ItemAnalysis {
  const text = `${item.title} ${item.excerpt}`.toLowerCase();
  const updatedYear = item.contentUpdatedAt?.getFullYear() ?? new Date().getFullYear();
  const old = new Date().getFullYear() - updatedYear >= 4;
  const clickbait = /震惊|万万没想到|必看|内幕|真相|割韭菜|暴富|逆天|封神/.test(text);
  const tutorial = /教程|指南|入门|代码|项目|工具|agent|rag|mcp|ai|模型|编程/.test(text);
  const long = item.excerpt.length > 180;

  let action: ItemAction = "skim";
  if (old) action = "outdated";
  if (clickbait) action = "delete";
  if (tutorial && item.voteupCount > 100) action = "deep_read";
  if (!long && item.voteupCount < 20) action = "delete";

  const tags = [
    tutorial ? "学习资料" : "观点文章",
    old ? "内容过时" : "可读",
    clickbait ? "标题党" : "普通标题",
  ];

  return {
    platformItemId: item.platformItemId,
    action,
    tags,
    reason:
      action === "delete"
        ? "信息密度和长期价值偏低，适合先清理。"
        : action === "deep_read"
          ? "主题偏学习/工具且反馈较好，值得保留精读。"
          : action === "outdated"
            ? "内容更新时间较早，可能已经不适合作为当前参考。"
            : "有一定信息量，但建议先看摘要再决定是否继续读。",
    summary: item.excerpt ? item.excerpt.slice(0, 90) : item.title,
    readMinutes: Math.max(2, Math.min(25, Math.ceil((item.excerpt.length + item.title.length) / 120))),
    qualityScore: Math.max(10, Math.min(95, Math.round(Math.log10(item.voteupCount + 10) * 25))),
    duplicateKey: normalizeDuplicateKey(item.title),
  };
}

function normalizeDuplicateKey(title: string) {
  return title
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 24)
    .toLowerCase();
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
