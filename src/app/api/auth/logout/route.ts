import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const c = await cookies();
  c.set("session", "", { expires: new Date(0), path: "/" });
  c.set("admin_verified", "", { expires: new Date(0), path: "/" });
  return NextResponse.json({ ok: true });
}
