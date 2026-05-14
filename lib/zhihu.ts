import { z } from "zod";

const collectionUrlSchema = z.string().url();

const zhihuItemSchema = z.record(z.string(), z.unknown());

const zhihuResponseSchema = z.object({
  data: z.array(zhihuItemSchema),
  paging: z.object({
    is_end: z.boolean(),
    totals: z.number().optional().default(0),
    next: z.string().optional(),
  }),
});

const zhihuViewerSchema = z.object({
  id: z.string().or(z.number()).optional(),
  name: z.string().optional().default("知乎用户"),
  url_token: z.string().optional().default(""),
  avatar_url: z.string().optional(),
});

const zhihuCollectionSchema = z.record(z.string(), z.unknown());

const zhihuCollectionsResponseSchema = z.object({
  data: z.array(zhihuCollectionSchema),
  paging: z.object({
    is_end: z.boolean(),
    next: z.string().optional(),
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

export type ZhihuViewer = {
  id: string;
  name: string;
  urlToken: string;
  avatarUrl?: string;
};

export type ZhihuCollection = {
  id: string;
  title: string;
  description: string;
  itemCount: number | null;
  url: string;
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

/** 未传 maxItems 时拉取收藏夹全部内容（分页至 is_end），最多 SAFETY_MAX_COLLECTION_ITEMS 条以防异常。 */
const SAFETY_MAX_COLLECTION_ITEMS = 20_000;

export async function fetchZhihuPublicCollection(inputUrl: string, maxItems?: number) {
  const collectionId = parseZhihuCollectionId(inputUrl);
  return fetchZhihuCollectionContents(collectionId, maxItems != null ? { maxItems } : {});
}

export async function getZhihuViewer(cookieHeader: string): Promise<ZhihuViewer> {
  const parsed = zhihuViewerSchema.parse(await zhihuJson("https://www.zhihu.com/api/v4/me", cookieHeader));

  if (!parsed.url_token) {
    throw new Error("知乎登录态未返回 url_token，请确认 Cookie 已登录且包含 z_c0。");
  }

  return {
    id: parsed.id ? String(parsed.id) : "",
    name: parsed.name,
    urlToken: parsed.url_token,
    avatarUrl: parsed.avatar_url,
  };
}

export async function listZhihuCollections(cookieHeader: string, urlToken: string) {
  const token = encodeURIComponent(urlToken);
  const candidates = [
    `https://www.zhihu.com/api/v4/members/${token}/favlists?limit=20&offset=0`,
    `https://www.zhihu.com/api/v4/members/${token}/collections?limit=20&offset=0`,
    `https://www.zhihu.com/api/v4/members/${token}/created_collections?limit=20&offset=0`,
  ];
  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      const collections = await listZhihuCollectionsFromEndpoint(candidate, cookieHeader);
      if (collections.length > 0) return enrichZhihuCollectionCounts(collections, cookieHeader);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`未能读取知乎收藏夹列表：${errors.join(" / ") || "返回为空"}`);
}

async function enrichZhihuCollectionCounts(collections: ZhihuCollection[], cookieHeader: string) {
  return Promise.all(
    collections.map(async (collection) => {
      if (collection.itemCount != null) return collection;

      try {
        return {
          ...collection,
          itemCount: await fetchZhihuCollectionTotal(collection.id, cookieHeader),
        };
      } catch {
        return collection;
      }
    }),
  );
}

async function fetchZhihuCollectionTotal(collectionId: string, cookieHeader: string) {
  const endpoint = new URL(`https://www.zhihu.com/api/v4/collections/${collectionId}/contents`);
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("offset", "0");
  const payload = asRecord(await zhihuJson(endpoint, cookieHeader));
  const paging = asRecord(payload.paging);

  return asNumber(paging.totals) ?? null;
}

async function listZhihuCollectionsFromEndpoint(initialUrl: string, cookieHeader: string) {
  const collections: ZhihuCollection[] = [];
  let endpoint = new URL(initialUrl);

  while (collections.length < 200) {
    const parsed = zhihuCollectionsResponseSchema.parse(await zhihuJson(endpoint, cookieHeader));
    collections.push(...parsed.data.map(normalizeZhihuCollection));

    if (parsed.paging.is_end || parsed.data.length === 0 || !parsed.paging.next) {
      break;
    }

    endpoint = resolveZhihuPagingUrl(parsed.paging.next);
  }

  return collections;
}

function resolveZhihuPagingUrl(next: string): URL {
  try {
    return new URL(next);
  } catch {
    try {
      return new URL(next, "https://www.zhihu.com");
    } catch {
      throw new Error("知乎分页 next 链接无效，无法继续拉取收藏夹列表。");
    }
  }
}

export async function fetchZhihuCollectionContents(
  collectionId: string,
  options: { maxItems?: number; cookieHeader?: string } = {},
) {
  const capped = options.maxItems != null;
  const effectiveMax = capped ? options.maxItems! : SAFETY_MAX_COLLECTION_ITEMS;
  const pageSize = capped ? Math.min(20, Math.max(5, options.maxItems!)) : 20;
  const items: ZhihuCollectionItem[] = [];
  let offset = 0;
  let total = 0;

  while (items.length < effectiveMax) {
    const endpoint = new URL(`https://www.zhihu.com/api/v4/collections/${collectionId}/contents`);
    const pageLimit = capped ? Math.min(pageSize, effectiveMax - items.length) : pageSize;
    endpoint.searchParams.set("limit", String(pageLimit));
    endpoint.searchParams.set("offset", String(offset));

    const parsed = zhihuResponseSchema.parse(await zhihuJson(endpoint, options.cookieHeader));
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

export function normalizeCookieHeader(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("请粘贴知乎 Cookie。");
  }

  const cookieHeader = trimmed.toLowerCase().startsWith("cookie:")
    ? trimmed.slice(trimmed.indexOf(":") + 1).trim()
    : trimmed;

  if (!cookieHeader.includes("z_c0=")) {
    throw new Error("Cookie 中未找到 z_c0，请确认已经在知乎网页登录。");
  }

  return cookieHeader;
}

async function zhihuJson(endpoint: URL | string, cookieHeader?: string) {
  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      referer: "https://www.zhihu.com/",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 saved-lists-cleaner/0.1",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`知乎接口返回 ${response.status}，登录态可能已失效或收藏夹不可访问。`);
  }

  return response.json();
}

function normalizeZhihuCollection(collection: z.infer<typeof zhihuCollectionSchema>): ZhihuCollection {
  const id = asString(collection.id) ?? asString(collection.favlist_id) ?? "unknown";
  const title =
    asString(collection.title) ??
    asString(collection.name) ??
    asString(collection.favlist_title) ??
    `知乎收藏夹 ${id}`;

  return {
    id,
    title,
    description: asString(collection.description) ?? "",
    itemCount:
      asNumber(collection.item_count) ??
      asNumber(collection.items_count) ??
      asNumber(collection.answer_count) ??
      asNumber(collection.content_count) ??
      null,
    url: asString(collection.url) ?? `https://www.zhihu.com/collection/${id}`,
  };
}

/** 知乎接口常见 `//zhuanlan...` 或 `/question/...`，保证为绝对 http(s) URL，避免下游与浏览器解析异常。 */
function normalizeZhihuContentUrl(raw: string | undefined): string {
  const u = (raw ?? "").trim();
  if (!u) return "https://www.zhihu.com";
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) {
    try {
      return new URL(u, "https://www.zhihu.com").href;
    } catch {
      return "https://www.zhihu.com";
    }
  }
  try {
    return new URL(u).href;
  } catch {
    return "https://www.zhihu.com";
  }
}

function normalizeZhihuItem(item: z.infer<typeof zhihuItemSchema>): ZhihuCollectionItem {
  const content = asRecord(item.content);
  const target = Object.keys(content).length > 0 ? content : item;
  const question = asRecord(target.question);
  const author = asRecord(target.author);
  const id = asString(target.id) ?? asString(item.id) ?? "unknown";
  const title =
    asString(target.title) ??
    asString(question.title) ??
    asString(target.excerpt_title) ??
    asString(target.name) ??
    asString(target.url) ??
    `知乎内容 ${id}`;

  return {
    platformItemId: id,
    type: asString(target.type) ?? asString(item.type) ?? "unknown",
    title,
    url: normalizeZhihuContentUrl(asString(target.url) ?? asString(item.url)),
    excerpt: asString(target.excerpt) ?? asString(item.excerpt) ?? "",
    authorName: asString(author.name) ?? "",
    voteupCount: asNumber(target.voteup_count) ?? 0,
    commentCount: asNumber(target.comment_count) ?? 0,
    collectTime: fromUnix(asNumber(item.collect_time)),
    contentCreatedAt: fromUnix(asNumber(target.created_time)),
    contentUpdatedAt: fromUnix(asNumber(target.updated_time)),
  };
}

function fromUnix(value?: number) {
  return value ? new Date(value * 1000) : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
