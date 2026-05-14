import path from "node:path";
import { chromium } from "playwright";

const profileDir =
  process.env.ZHIHU_PROFILE_DIR ??
  path.resolve(process.cwd(), "test/zhihu-oauth-import/.zhihu-profile");
const maxCollections = Number(process.env.ZHIHU_TEST_MAX_COLLECTIONS ?? 20);

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeViewer(payload) {
  return {
    id: asString(payload.id),
    name: asString(payload.name),
    urlToken: asString(payload.url_token) ?? asString(payload.urlToken),
  };
}

function normalizeCollection(raw) {
  const collection = asRecord(raw);
  const id = asString(collection.id) ?? asString(collection.favlist_id);
  if (!id) return null;

  return {
    id,
    title:
      asString(collection.title) ??
      asString(collection.name) ??
      asString(collection.favlist_title) ??
      `知乎收藏夹 ${id}`,
    url: asString(collection.url) ?? `https://www.zhihu.com/collection/${id}`,
    itemCount:
      asNumber(collection.item_count) ??
      asNumber(collection.items_count) ??
      asNumber(collection.answer_count) ??
      asNumber(collection.content_count) ??
      null,
  };
}

function normalizeItem(raw) {
  const item = asRecord(raw);
  const content = asRecord(item.content);
  const target = Object.keys(content).length ? content : item;
  const question = asRecord(target.question);
  const author = asRecord(target.author);

  return {
    id: asString(target.id) ?? asString(item.id),
    type: asString(target.type) ?? asString(item.type),
    title:
      asString(target.title) ??
      asString(question.title) ??
      asString(target.excerpt_title) ??
      asString(target.name) ??
      "(无标题)",
    url: asString(target.url) ?? asString(item.url),
    authorName: asString(author.name),
  };
}

async function launchProfile() {
  const options = {
    headless: true,
    viewport: { width: 1240, height: 860 },
    locale: "zh-CN",
    args: ["--disable-blink-features=AutomationControlled"],
  };

  try {
    return await chromium.launchPersistentContext(profileDir, { ...options, channel: "chrome" });
  } catch {
    return chromium.launchPersistentContext(profileDir, options);
  }
}

async function readCookieHeader() {
  const context = await launchProfile();
  try {
    const cookies = await context.cookies("https://www.zhihu.com");
    return {
      cookieHeader: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
      cookieNames: cookies.map((cookie) => cookie.name).sort(),
    };
  } finally {
    await context.close();
  }
}

async function zhihuJson(url, cookieHeader) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      referer: "https://www.zhihu.com/",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 saved-lists-cleaner-test/0.1",
      cookie: cookieHeader,
    },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Zhihu API HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  return JSON.parse(text);
}

async function listCollections(cookieHeader, urlToken) {
  const token = encodeURIComponent(urlToken);
  const endpoints = [
    `https://www.zhihu.com/api/v4/members/${token}/favlists?limit=20&offset=0`,
    `https://www.zhihu.com/api/v4/members/${token}/collections?limit=20&offset=0`,
    `https://www.zhihu.com/api/v4/members/${token}/created_collections?limit=20&offset=0`,
  ];
  const errors = [];

  for (const endpoint of endpoints) {
    try {
      const payload = await zhihuJson(endpoint, cookieHeader);
      const collections = (Array.isArray(payload.data) ? payload.data : [])
        .map(normalizeCollection)
        .filter(Boolean)
        .slice(0, maxCollections);
      if (collections.length) return collections;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`无法获取收藏夹列表：${errors.join(" / ")}`);
}

async function fetchCollectionTotal(cookieHeader, collectionId) {
  const endpoint = `https://www.zhihu.com/api/v4/collections/${encodeURIComponent(
    collectionId,
  )}/contents?limit=1&offset=0`;
  const payload = await zhihuJson(endpoint, cookieHeader);
  return asNumber(asRecord(payload.paging).totals) ?? 0;
}

async function fetchCollectionPreview(cookieHeader, collectionId) {
  const endpoint = `https://www.zhihu.com/api/v4/collections/${encodeURIComponent(
    collectionId,
  )}/contents?limit=5&offset=0`;
  const payload = await zhihuJson(endpoint, cookieHeader);
  return (Array.isArray(payload.data) ? payload.data : []).map(normalizeItem);
}

const { cookieHeader, cookieNames } = await readCookieHeader();
const hasLoginCookie = cookieNames.includes("z_c0");

if (!hasLoginCookie) {
  throw new Error(
    `未从 ${profileDir} 读取到 z_c0。请先登录知乎，或设置 ZHIHU_PROFILE_DIR 指向已登录的 Chrome profile。`,
  );
}

const viewer = normalizeViewer(await zhihuJson("https://www.zhihu.com/api/v4/me", cookieHeader));
if (!viewer.urlToken) {
  throw new Error("/api/v4/me 未返回 url_token，无法继续获取收藏夹。");
}

const collections = await listCollections(cookieHeader, viewer.urlToken);
const collectionsWithTotals = await Promise.all(
  collections.map(async (collection) => ({
    ...collection,
    itemCount: collection.itemCount ?? (await fetchCollectionTotal(cookieHeader, collection.id)),
  })),
);
const firstNonEmpty = collectionsWithTotals.find((collection) => collection.itemCount > 0);
const preview = firstNonEmpty ? await fetchCollectionPreview(cookieHeader, firstNonEmpty.id) : [];

console.log(
  JSON.stringify(
    {
      profileDir,
      cookie: {
        hasZC0: hasLoginCookie,
        cookieNames,
        cookieHeaderPrinted: false,
      },
      viewer,
      collections: collectionsWithTotals.map(({ id, title, itemCount }) => ({ id, title, itemCount })),
      previewCollection: firstNonEmpty
        ? {
            id: firstNonEmpty.id,
            title: firstNonEmpty.title,
            itemCount: firstNonEmpty.itemCount,
            previewCount: preview.length,
            firstItem: preview[0],
          }
        : null,
    },
    null,
    2,
  ),
);
