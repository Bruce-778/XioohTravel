import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: t("auth.invalidEmail") }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(
      `INSERT INTO verification_codes (email, code, expires_at) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3`,
      [email, code, expiresAt]
    );

    // In a real app, send the email here
    console.log(`Verification code for ${email}: ${code}`);

    return NextResponse.json({ 
      ok: true, 
      message: t("auth.codeSent"),
      // MVP: In development mode, return the code for testing convenience
      ...(process.env.NODE_ENV === "development" ? { _dev_code: code } : {})
    });
  } catch (e: any) {
    console.error("SEND_CODE_ERROR:", e);
    return NextResponse.json(
      { 
        error: t("api.serverError"),
        details: process.env.NODE_ENV === "development" ? e.message : undefined 
      }, 
      { status: 500 }
    );
  }
}
