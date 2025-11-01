// @/app/api/auth/oauth/signup/route.ts

import { NextResponse } from "next/server";
import { issueJwt } from "@/lib/auth"
import { createUserOAuth } from "@/lib/docs/user";

export async function POST(req: Request) {
  try {
    const { email, name, provider, info } = await req.json();

    if (!email || !name || !provider) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const user = await createUserOAuth(email, name, provider, info);
    const token = issueJwt(user);

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set("session", token, { httpOnly: true });
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "oauth_signup_failed" }, { status: 500 });
  }
}
