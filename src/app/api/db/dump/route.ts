// /app/api/db/dump/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt, userExistsIdx, isUserInGroup } from "@/lib/user";
import { dump } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const user = await verifyJwt(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
    }
    const [exists, isAdmin] = await Promise.all([
      userExistsIdx(user.uidx),
      isUserInGroup(user.uidx, "group:admin"),
    ]);
    if (!exists) {
      return NextResponse.json({ ok: false, error: "no_such_user" }, { status: 403 });
    }
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const sql = await dump();
    return new NextResponse(sql, {
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="dump.sql"`,
      },
    });
  } catch (err: any) {
    console.error("dump failed:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
