import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  normalizeEmailAddress,
  sendAuthVerificationCodeEmail,
} from "@/lib/email";
import { getT } from "@/lib/i18n";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const SendCodeSchema = z.object({
  email: z.string().trim().email(),
});

const SEND_CODE_COOLDOWN_SECONDS = 60;

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    // Per-email cooldown exists below; this guards against one IP cycling
    // through many different addresses to burn the email quota.
    const ipLimit = checkRateLimit(`send-code:${getClientIp(req)}`, 10, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: t("api.tooManyRequests") },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } }
      );
    }

    const parsed = SendCodeSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json({ error: t("auth.invalidEmail") }, { status: 400 });
    }

    const email = normalizeEmailAddress(parsed.data.email);
    const code = String(randomInt(100000, 1000000));
    const expiresInMinutes = 10;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const upsertSql = `INSERT INTO verification_codes (email, code, expires_at, created_at, attempts)
       VALUES ($1, $2, $3, NOW(), 0)
       ON CONFLICT (email) DO UPDATE
         SET code = $2, expires_at = $3, created_at = NOW(), attempts = 0
       WHERE COALESCE(verification_codes.created_at, TIMESTAMPTZ 'epoch')
         < NOW() - ($4::int * INTERVAL '1 second')
       RETURNING email`;
    const upsertParams = [email, code, expiresAt, SEND_CODE_COOLDOWN_SECONDS];

    let upserted;
    try {
      upserted = await db.query(upsertSql, upsertParams);
    } catch (error: any) {
      if (error?.code !== "42703") throw error;
      // attempts column not migrated yet; add it and retry.
      await db.query("ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0");
      upserted = await db.query(upsertSql, upsertParams);
    }

    if (upserted.rowCount === 0) {
      return NextResponse.json(
        {
          error: t("auth.codeRecentlySent"),
          retryAfter: SEND_CODE_COOLDOWN_SECONDS,
        },
        {
          status: 429,
          headers: { "Retry-After": String(SEND_CODE_COOLDOWN_SECONDS) },
        }
      );
    }

    await sendAuthVerificationCodeEmail({
      email,
      code,
      expiresInMinutes,
    });

    return NextResponse.json({ 
      ok: true, 
      message: t("auth.codeSent"),
      // MVP: In development mode, return the code for testing convenience
      ...(process.env.NODE_ENV === "development" ? { _dev_code: code } : {})
    });
  } catch (e: any) {
    const errorCode = typeof e?.code === "string" ? e.code : null;

    if (errorCode === "AUTH_EMAIL_TEST_ONLY") {
      return NextResponse.json({ error: t("auth.testEmailOnly") }, { status: 400 });
    }

    console.error("SEND_CODE_ERROR:", e);
    return NextResponse.json(
      { 
        error: t("auth.failedToSend"),
        details: process.env.NODE_ENV === "development" ? e.message : undefined 
      }, 
      { status: 500 }
    );
  }
}
