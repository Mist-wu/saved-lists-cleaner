import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeItems, buildRunSummary } from "@/lib/analysis";
import { prisma } from "@/lib/prisma";
import { getZhihuSessionCookie } from "@/lib/session";
import { fetchZhihuCollectionContents, fetchZhihuPublicCollection } from "@/lib/zhihu";

export const runtime = "nodejs";

const importRequestSchema = z.object({
  url: z.string().url().optional(),
  collectionId: z.string().min(1).optional(),
  collectionTitle: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const input = importRequestSchema.parse(await request.json());
    if (!input.url && !input.collectionId) {
      throw new Error("请提供公开收藏夹 URL，或先登录后选择收藏夹。");
    }

    const collection = input.collectionId
      ? await fetchLoginCollection(input.collectionId)
      : await fetchZhihuPublicCollection(input.url!);
    const analyses = await analyzeItems(collection.items);
    const summary = buildRunSummary(analyses);
    const analysisById = new Map(analyses.map((item) => [item.platformItemId, item]));

    const run = await prisma.importRun.create({
      data: {
        source: input.collectionId ? "zhihu_login" : "zhihu_public",
        originalUrl: input.url ?? `https://www.zhihu.com/collection/${collection.collectionId}`,
        collectionId: collection.collectionId,
        title: input.collectionTitle || `知乎收藏夹 ${collection.collectionId}`,
        itemCount: collection.items.length,
        analyzedCount: analyses.length,
        healthScore: summary.healthScore,
        summary: summary.summary,
        items: {
          create: collection.items.map((item) => {
            const analysis = analysisById.get(item.platformItemId);
            return {
              platformItemId: item.platformItemId,
              type: item.type,
              title: item.title,
              url: item.url,
              excerpt: item.excerpt,
              authorName: item.authorName,
              voteupCount: item.voteupCount,
              commentCount: item.commentCount,
              collectTime: item.collectTime,
              contentCreatedAt: item.contentCreatedAt,
              contentUpdatedAt: item.contentUpdatedAt,
              aiAction: analysis?.action ?? "unreviewed",
              aiTags: analysis?.tags ?? [],
              aiReason: analysis?.reason ?? "",
              aiSummary: analysis?.summary ?? "",
              readMinutes: analysis?.readMinutes ?? 3,
              qualityScore: analysis?.qualityScore ?? 50,
              duplicateKey: analysis?.duplicateKey ?? "",
            };
          }),
        },
      },
      include: {
        items: {
          orderBy: [{ aiAction: "asc" }, { qualityScore: "desc" }],
        },
      },
    });

    return NextResponse.json({
      run,
      totals: {
        zhihuTotal: collection.total,
        imported: collection.items.length,
        actions: summary.counts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function fetchLoginCollection(collectionId: string) {
  const { cookieHeader } = await getZhihuSessionCookie();
  return fetchZhihuCollectionContents(collectionId, { cookieHeader });
}
