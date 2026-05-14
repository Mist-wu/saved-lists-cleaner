import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptSecret, setAppSessionCookie } from "@/lib/session";
import { getZhihuViewer, normalizeCookieHeader } from "@/lib/zhihu";

export const runtime = "nodejs";

const loginRequestSchema = z.object({
  cookieHeader: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const input = loginRequestSchema.parse(await request.json());
    const cookieHeader = normalizeCookieHeader(input.cookieHeader);
    const viewer = await getZhihuViewer(cookieHeader);

    const session = await prisma.zhihuSession.create({
      data: {
        viewerId: viewer.id,
        viewerName: viewer.name,
        urlToken: viewer.urlToken,
        encryptedCookie: encryptSecret(cookieHeader),
      },
    });

    await setAppSessionCookie(session.id);

    return NextResponse.json({
      viewer,
      session: {
        id: session.id,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "知乎登录失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
