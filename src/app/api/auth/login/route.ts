// @/app/api/auth/login/route.ts

import { NextResponse } from "next/server";
import { verifyUserLocal, issueJwt } from "@/lib/user";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "missing_credentials" }, { status: 400 });
    }

    const user = await verifyUserLocal(email, password);
    if (!user) {
      return NextResponse.json({ ok: false, error: "invalid_email_or_password" }, { status: 401 });
    }

    const token = issueJwt(user);
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set("session", token, { httpOnly: true });
    return res;
  } catch (err: any) {
    console.log(err.toString());
    return NextResponse.json({ ok: false, error: err.message || "login_failed" }, { status: 500 });
  }
}
