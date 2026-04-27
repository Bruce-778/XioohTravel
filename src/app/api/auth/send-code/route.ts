import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  normalizeEmailAddress,
  sendAuthVerificationCodeEmail,
} from "@/lib/email";
import { getT } from "@/lib/i18n";

const SendCodeSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    const parsed = SendCodeSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json({ error: t("auth.invalidEmail") }, { status: 400 });
    }

    const email = normalizeEmailAddress(parsed.data.email);
    const code = String(randomInt(100000, 1000000));
    const expiresInMinutes = 10;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await db.query(
      `INSERT INTO verification_codes (email, code, expires_at) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3`,
      [email, code, expiresAt]
    );

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
