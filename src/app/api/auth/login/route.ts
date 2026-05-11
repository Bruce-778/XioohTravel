import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { normalizeEmailAddress } from "@/lib/email";
import { getT } from "@/lib/i18n";
import { isAdminEmail } from "@/lib/adminConfig";

export async function POST(req: Request) {
  const { t } = await getT();
  try {
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

    // Check if user email exists
    let { rows: emailRows } = await db.query(
      "SELECT user_id FROM user_emails WHERE LOWER(email) = $1 LIMIT 1",
      [normalizedEmail]
    );

    let userId;
    if (emailRows.length === 0) {
      // Create new user
      const { rows: userRows } = await db.query(
        "INSERT INTO users (role) VALUES ('USER') RETURNING id"
      );
      userId = userRows[0].id;
      await db.query(
        "INSERT INTO user_emails (user_id, email, verified_at) VALUES ($1, $2, NOW())",
        [userId, normalizedEmail]
      );
    } else {
      userId = emailRows[0].user_id;
    }

    const role = isAdminEmail(normalizedEmail) ? "ADMIN" : "USER";
    await db.query("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2", [role, userId]);

    await setSession({ userId, role, email: normalizedEmail });

    return NextResponse.json({ ok: true, role });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: t("api.serverError") }, { status: 500 });
  }
}
