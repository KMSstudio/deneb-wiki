// @/app/api/auth/signup/route.ts

import { NextResponse } from "next/server";
import { createUserLocal, issueJwt } from "@/lib/user";

export async function POST(req: Request) {
  try {
    const { email, password, name, info } = await req.json();
    if (!email || !password || !name || !info) {
      return NextResponse.json({ ok: false, error: "missing_credentials" }, { status: 400 });
    }

    const user = await createUserLocal(email, password, name, info);
    const token = issueJwt(user);

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set("session", token, { httpOnly: true });
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "signup_failed" }, { status: 400 });
  }
}
