import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeItems, buildRunSummary } from "@/lib/analysis";
import { prisma } from "@/lib/prisma";
import { fetchZhihuPublicCollection } from "@/lib/zhihu";

export const runtime = "nodejs";

const importRequestSchema = z.object({
  url: z.string().url(),
  limit: z.number().int().min(5).max(80).default(32),
});

export async function POST(request: Request) {
  try {
    const input = importRequestSchema.parse(await request.json());
    const collection = await fetchZhihuPublicCollection(input.url, input.limit);
    const analyses = await analyzeItems(collection.items);
    const summary = buildRunSummary(analyses);
    const analysisById = new Map(analyses.map((item) => [item.platformItemId, item]));

    const run = await prisma.importRun.create({
      data: {
        originalUrl: input.url,
        collectionId: collection.collectionId,
        title: `知乎收藏夹 ${collection.collectionId}`,
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
