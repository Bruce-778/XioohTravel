import { NextResponse } from "next/server";
import { isAdminVerified, setAdminVerified } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function GET() {
  const verified = await isAdminVerified();
  if (verified) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    const { secret } = await req.json();
    const adminSecret = process.env.ADMIN_TOKEN || process.env.ADMIN_SECRET_KEY;
    
    if (secret !== adminSecret) {
      return NextResponse.json({ error: t("api.invalidSecret") }, { status: 400 });
    }

    await setAdminVerified();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: t("api.serverError") }, { status: 500 });
  }
}
