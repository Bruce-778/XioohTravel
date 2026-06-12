import { NextResponse } from "next/server";
import { isAdminEmail, isAdminSecretConfigured, verifyAdminSecret } from "@/lib/adminConfig";
import { getSession, isAdminVerifiedForSession, setAdminVerified } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, status: "unauthenticated" }, { status: 401 });
  }

  if (session.role !== "ADMIN" || !isAdminEmail(session.email)) {
    return NextResponse.json({ ok: false, status: "forbidden" }, { status: 403 });
  }

  const verified = await isAdminVerifiedForSession(session);
  if (verified) {
    return NextResponse.json({ ok: true, status: "verified" });
  }

  return NextResponse.json({ ok: false, status: "requires_secret" }, { status: 401 });
}

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: t("api.unauthorized"), status: "unauthenticated" }, { status: 401 });
    }

    if (session.role !== "ADMIN" || !isAdminEmail(session.email)) {
      return NextResponse.json({ error: t("api.forbidden"), status: "forbidden" }, { status: 403 });
    }

    if (!isAdminSecretConfigured()) {
      return NextResponse.json({ error: t("api.adminTokenNotConfigured") }, { status: 500 });
    }

    const ipLimit = checkRateLimit(`verify-secret:${getClientIp(req)}`, 5, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: t("api.tooManyRequests") },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } }
      );
    }

    const { secret } = await req.json();

    if (!verifyAdminSecret(secret)) {
      return NextResponse.json({ error: t("api.invalidSecret") }, { status: 400 });
    }

    await setAdminVerified(session);

    return NextResponse.json({ ok: true, status: "verified" });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: t("api.serverError") }, { status: 500 });
  }
}
