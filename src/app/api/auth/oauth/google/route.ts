// @/app/api/oauth/google/route.ts

import { NextResponse } from "next/server";
import { getUserByOAuth, issueJwt } from "@/lib/docs/user";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ ok: false, error: "no_code" }, { status: 400 });
  }

  // 1. 토큰 교환
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  }).then((r) => r.json());

  if (!tokenRes.access_token) {
    return NextResponse.json(
      { ok: false, error: "token_failed", detail: tokenRes },
      { status: 400 },
    );
  }

  // 2. 사용자 프로필 가져오기
  const profile = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenRes.access_token}` },
  }).then((r) => r.json());

  if (!profile.email) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  const { email, name } = profile;

  // 3. DB에서 유저 조회
  const user = await getUserByOAuth(email, "google");
  if (!user) {
    // ❌ 유저 없음 → 프론트에서 가입 절차 필요
    return NextResponse.json({
      ok: false,
      error: "user_not_found",
      email,
      name,
      provider: "google",
    });
  }

  // ✅ 유저 존재 → 로그인 처리
  const token = issueJwt(user);
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set("session", token, { httpOnly: true });
  return res;
}
