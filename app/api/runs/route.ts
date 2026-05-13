import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const runs = await prisma.importRun.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        take: 6,
        orderBy: [{ aiAction: "asc" }, { qualityScore: "desc" }],
      },
    },
  });

  return NextResponse.json({ runs });
}
