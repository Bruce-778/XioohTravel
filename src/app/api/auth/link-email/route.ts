import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { normalizeEmailAddress } from "@/lib/email";
import { getT } from "@/lib/i18n";

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: t("api.unauthorized") }, { status: 401 });

    const { email, code } = await req.json();
    const normalizedEmail = normalizeEmailAddress(String(email ?? ""));

    const { rows } = await db.query(
      "SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > NOW()",
      [normalizedEmail, code]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: t("api.invalidCode") }, { status: 400 });
    }

    // Delete the code after use
    await db.query("DELETE FROM verification_codes WHERE email = $1", [normalizedEmail]);

    // Link email to user
    const { rowCount } = await db.query(
      "UPDATE user_emails SET user_id = $1, email = $2, verified_at = NOW() WHERE LOWER(email) = $3",
      [session.userId, normalizedEmail, normalizedEmail]
    );

    if (!rowCount) {
      await db.query(
        "INSERT INTO user_emails (user_id, email, verified_at) VALUES ($1, $2, NOW())",
        [session.userId, normalizedEmail]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: t("api.serverError") }, { status: 500 });
  }
}
