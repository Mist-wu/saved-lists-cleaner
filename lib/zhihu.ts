import { z } from "zod";

const collectionUrlSchema = z.string().url();

const zhihuItemSchema = z.object({
  id: z.number().or(z.string()),
  type: z.string().default("unknown"),
  url: z.string().default(""),
  excerpt: z.string().optional().default(""),
  voteup_count: z.number().optional().default(0),
  comment_count: z.number().optional().default(0),
  collect_time: z.number().optional(),
  created_time: z.number().optional(),
  updated_time: z.number().optional(),
  author: z
    .object({
      name: z.string().optional().default(""),
    })
    .optional(),
  question: z
    .object({
      title: z.string().optional().default(""),
    })
    .optional(),
  title: z.string().optional().default(""),
});

const zhihuResponseSchema = z.object({
  data: z.array(zhihuItemSchema),
  paging: z.object({
    is_end: z.boolean(),
    totals: z.number().optional().default(0),
  }),
});

export type ZhihuCollectionItem = {
  platformItemId: string;
  type: string;
  title: string;
  url: string;
  excerpt: string;
  authorName: string;
  voteupCount: number;
  commentCount: number;
  collectTime?: Date;
  contentCreatedAt?: Date;
  contentUpdatedAt?: Date;
};

export function parseZhihuCollectionId(input: string): string {
  const value = collectionUrlSchema.parse(input.trim());
  const url = new URL(value);
  const match =
    url.pathname.match(/\/collection\/(\d+)/) ??
    url.pathname.match(/\/api\/v4\/collections\/(\d+)\/contents/);

  if (!match) {
    throw new Error("请粘贴知乎公开收藏夹链接，例如 https://www.zhihu.com/collection/21827231");
  }

  return match[1];
}

export async function fetchZhihuPublicCollection(inputUrl: string, maxItems = 40) {
  const collectionId = parseZhihuCollectionId(inputUrl);
  const items: ZhihuCollectionItem[] = [];
  const pageSize = Math.min(20, Math.max(5, maxItems));
  let offset = 0;
  let total = 0;

  while (items.length < maxItems) {
    const endpoint = new URL(`https://www.zhihu.com/api/v4/collections/${collectionId}/contents`);
    endpoint.searchParams.set("limit", String(Math.min(pageSize, maxItems - items.length)));
    endpoint.searchParams.set("offset", String(offset));

    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 saved-lists-cleaner/0.1",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`知乎接口返回 ${response.status}，公开收藏夹可能不存在或不可访问。`);
    }

    const parsed = zhihuResponseSchema.parse(await response.json());
    total = parsed.paging.totals;
    items.push(...parsed.data.map(normalizeZhihuItem));

    if (parsed.paging.is_end || parsed.data.length === 0) {
      break;
    }

    offset += parsed.data.length;
  }

  return {
    collectionId,
    total,
    items,
  };
}

function normalizeZhihuItem(item: z.infer<typeof zhihuItemSchema>): ZhihuCollectionItem {
  const title = item.question?.title || item.title || item.url || `知乎内容 ${item.id}`;

  return {
    platformItemId: String(item.id),
    type: item.type,
    title,
    url: item.url,
    excerpt: item.excerpt ?? "",
    authorName: item.author?.name ?? "",
    voteupCount: item.voteup_count,
    commentCount: item.comment_count,
    collectTime: fromUnix(item.collect_time),
    contentCreatedAt: fromUnix(item.created_time),
    contentUpdatedAt: fromUnix(item.updated_time),
  };
}

function fromUnix(value?: number) {
  return value ? new Date(value * 1000) : undefined;
}
