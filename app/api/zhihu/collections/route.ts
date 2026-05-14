import { NextResponse } from "next/server";
import { getZhihuSessionCookie } from "@/lib/session";
import { listZhihuCollections } from "@/lib/zhihu";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { session, cookieHeader } = await getZhihuSessionCookie();
    if (!session.urlToken) {
      throw new Error("当前登录态缺少知乎 url_token，请重新保存 Cookie。");
    }

    const collections = await listZhihuCollections(cookieHeader, session.urlToken);

    return NextResponse.json({
      viewer: {
        id: session.viewerId,
        name: session.viewerName,
        urlToken: session.urlToken,
      },
      collections,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取收藏夹列表失败";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
