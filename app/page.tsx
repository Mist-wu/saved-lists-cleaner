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
  const [url, setUrl] = useState("https://www.zhihu.com/collection/21827231");
  const [limit, setLimit] = useState(12);
  const [filter, setFilter] = useState("all");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(() => result?.run.items ?? [], [result]);
  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.aiAction === filter);
  }, [filter, items]);

  const totalReadMinutes = items.reduce((sum, item) => sum + item.readMinutes, 0);
  const quickCleanCount = items.filter((item) =>
    ["delete", "skim", "outdated", "duplicate"].includes(item.aiAction),
  ).length;

  async function importCollection() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, limit }),
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
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Saved Lists Cleaner</h1>
      <p>公开知乎收藏夹 URL 导入，DeepSeek 分析，PostgreSQL 保存。当前版本只读，不做删除写操作。</p>

      <section>
        <h2>导入</h2>
        <label htmlFor="collection-url">知乎公开收藏夹 URL</label>
        <input
          id="collection-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.zhihu.com/collection/21827231"
        />

        <label htmlFor="limit">导入数量</label>
        <input
          id="limit"
          type="number"
          min={5}
          max={80}
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value))}
        />

        <button onClick={importCollection} disabled={loading}>
          {loading ? "正在导入并分析..." : "开始导入"}
        </button>

        {error ? <p role="alert">错误：{error}</p> : null}
      </section>

      {result ? (
        <>
          <section>
            <h2>体检报告</h2>
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
