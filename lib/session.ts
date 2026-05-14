import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const APP_SESSION_COOKIE = "slc_session";

function encryptionKey() {
  const secret = process.env.APP_SECRET;
  if (!secret || secret === "replace-with-random-secret") {
    throw new Error("APP_SECRET 未配置，无法安全保存知乎登录态。");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("登录态格式无效，请重新保存知乎 Cookie。");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function setAppSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(APP_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearAppSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(APP_SESSION_COOKIE);
}

export async function getZhihuSessionCookie() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (!sessionId) {
    throw new Error("请先保存知乎登录态，再获取收藏夹。");
  }

  const session = await prisma.zhihuSession.update({
    where: { id: sessionId },
    data: { lastUsedAt: new Date() },
  });

  return {
    session,
    cookieHeader: decryptSecret(session.encryptedCookie),
  };
}
