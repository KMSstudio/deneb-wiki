// @/app/api/auth/login/route.ts

import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { httpOnly: true, expires: new Date(0) });
  return res;
}

export async function GET() {
  const res = NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  );
  res.cookies.set("session", "", { httpOnly: true, expires: new Date(0) });
  return res;
}
