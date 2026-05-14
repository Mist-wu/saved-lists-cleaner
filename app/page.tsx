"use client";

import { useMemo, useState } from "react";

type SavedItem = {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  authorName: string;
  voteupCount: number;
  aiAction: string;
  aiTags: string[];
  aiReason: string;
  aiSummary: string;
  readMinutes: number;
  qualityScore: number;
};

type ImportResponse = {
  run: {
    id: string;
    originalUrl: string;
    collectionId: string;
    title: string | null;
    itemCount: number;
    analyzedCount: number;
    healthScore: number;
    summary: string;
    items: SavedItem[];
  };
  totals: {
    zhihuTotal: number;
    imported: number;
    actions: Record<string, number>;
  };
};

type ZhihuViewer = {
  id: string;
  name: string;
  urlToken: string;
};

type ZhihuCollection = {
  id: string;
  title: string;
  description: string;
  itemCount: number | null;
  url: string;
};

const actionLabels: Record<string, string> = {
  delete: "建议删除",
  skim: "建议速读",
  deep_read: "值得精读",
  outdated: "内容过时",
  duplicate: "疑似重复",
  keep: "保留",
  unreviewed: "未分析",
};

export default function Home() {
  const [cookieHeader, setCookieHeader] = useState("");
  const [viewer, setViewer] = useState<ZhihuViewer | null>(null);
  const [collections, setCollections] = useState<ZhihuCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [url, setUrl] = useState("https://www.zhihu.com/collection/21827231");
  const [limit, setLimit] = useState(12);
  const [filter, setFilter] = useState("all");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId);
  const items = useMemo(() => result?.run.items ?? [], [result]);
  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.aiAction === filter);
  }, [filter, items]);

  const totalReadMinutes = items.reduce((sum, item) => sum + item.readMinutes, 0);
  const quickCleanCount = items.filter((item) =>
    ["delete", "skim", "outdated", "duplicate"].includes(item.aiAction),
  ).length;

  async function saveZhihuLogin() {
    setLoading("login");
    setError("");

    try {
      const response = await fetch("/api/zhihu/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cookieHeader }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "知乎登录失败");
      }
      setViewer(data.viewer);
      setCookieHeader("");
      window.setTimeout(() => {
        void loadCollections();
      }, 150);
    } catch (err) {
      setError(err instanceof Error ? err.message : "知乎登录失败");
    } finally {
      setLoading("");
    }
  }

  async function loadCollections() {
    setLoading("collections");
    setError("");

    try {
      const response = await fetch("/api/zhihu/collections");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "获取收藏夹失败");
      }
      setViewer(data.viewer);
      setCollections(data.collections);
      setSelectedCollectionId(data.collections[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取收藏夹失败");
    } finally {
      setLoading("");
    }
  }

  async function importSelectedCollection() {
    if (!selectedCollection) {
      setError("请先选择一个知乎收藏夹。");
      return;
    }

    await importCollection({
      collectionId: selectedCollection.id,
      collectionTitle: selectedCollection.title,
    });
  }

  async function importPublicCollection() {
    await importCollection({ url });
  }

  async function importCollection(payload: { url?: string; collectionId?: string; collectionTitle?: string }) {
    setLoading("import");
    setError("");

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, limit }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "导入失败");
      }
      setResult(data);
      setFilter("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setLoading("");
    }
  }

  return (
    <main>
      <h1>Saved Lists Cleaner</h1>

      <section>
        <h2>1. 登录知乎</h2>
        <p>从已登录知乎的浏览器复制 Cookie 请求头，保存后服务器会加密存储，只用于收藏夹导入。</p>
        <label htmlFor="zhihu-cookie">知乎 Cookie</label>
        <textarea
          id="zhihu-cookie"
          value={cookieHeader}
          onChange={(event) => setCookieHeader(event.target.value)}
          placeholder="z_c0=...; _xsrf=..."
          rows={4}
        />
        <button onClick={saveZhihuLogin} disabled={loading === "login" || !cookieHeader.trim()}>
          {loading === "login" ? "正在验证知乎登录态..." : "保存登录态"}
        </button>
        {viewer ? (
          <p>
            当前知乎用户：{viewer.name} / {viewer.urlToken}
          </p>
        ) : null}
      </section>

      <section>
        <h2>2. 选择收藏夹</h2>
        <button onClick={loadCollections} disabled={loading === "collections"}>
          {loading === "collections" ? "正在获取收藏夹..." : "获取收藏夹列表"}
        </button>

        {collections.length > 0 ? (
          <fieldset>
            <legend>收藏夹列表</legend>
            {collections.map((collection) => (
              <label key={collection.id} className="choice">
                <input
                  type="radio"
                  name="collection"
                  value={collection.id}
                  checked={selectedCollectionId === collection.id}
                  onChange={() => setSelectedCollectionId(collection.id)}
                />
                <span>
                  {collection.title} / ID {collection.id} /{" "}
                  {collection.itemCount == null ? "数量未知" : `${collection.itemCount} 条`}
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p>登录后点击获取收藏夹列表。</p>
        )}
      </section>

      <section>
        <h2>3. 导入并分析</h2>
        <label htmlFor="limit">导入数量</label>
        <input
          id="limit"
          type="number"
          min={5}
          max={80}
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value))}
        />

        <button onClick={importSelectedCollection} disabled={loading === "import" || !selectedCollection}>
          {loading === "import" ? "正在导入并分析..." : "导入选中收藏夹"}
        </button>

        <h3>公开收藏夹 URL fallback</h3>
        <label htmlFor="collection-url">知乎公开收藏夹 URL</label>
        <input
          id="collection-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.zhihu.com/collection/21827231"
        />
        <button onClick={importPublicCollection} disabled={loading === "import"}>
          公开 URL 导入
        </button>

        {error ? <p role="alert">错误：{error}</p> : null}
      </section>

      {result ? (
        <>
          <section>
            <h2>体检报告</h2>
            <p>收藏夹：{result.run.title ?? result.run.collectionId}</p>
            <p>收藏夹 ID：{result.run.collectionId}</p>
            <p>知乎返回总数：{result.totals.zhihuTotal}</p>
            <p>本次导入：{result.totals.imported}</p>
            <p>AI 已分析：{result.run.analyzedCount}</p>
            <p>健康度：{result.run.healthScore} / 100</p>
            <p>预计阅读：{totalReadMinutes} 分钟</p>
            <p>可快速清理：{quickCleanCount} 条</p>
            <p>{result.run.summary}</p>
          </section>

          <section>
            <h2>筛选</h2>
            {["all", "delete", "skim", "deep_read", "outdated", "duplicate", "keep"].map((key) => (
              <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key}>
                {key === "all" ? "全部" : actionLabels[key]} (
                {key === "all" ? items.length : items.filter((item) => item.aiAction === key).length})
              </button>
            ))}
          </section>

          <section>
            <h2>清理工作台</h2>
            <ol>
              {filteredItems.map((item) => (
                <li key={item.id}>
                  <h3>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  </h3>
                  <p>
                    {actionLabels[item.aiAction] ?? item.aiAction} / 质量分 {item.qualityScore} /{" "}
                    {item.readMinutes} 分钟
                  </p>
                  <p>理由：{item.aiReason}</p>
                  <p>摘要：{item.aiSummary || item.excerpt}</p>
                  <p>
                    作者：{item.authorName || "未知"} / 赞同：{item.voteupCount} / 标签：
                    {item.aiTags.join("、") || "无"}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </main>
  );
}
