import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { normalizeEmailAddress } from "@/lib/email";
import { getT } from "@/lib/i18n";
import { isAdminEmail } from "@/lib/adminConfig";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_CODE_ATTEMPTS = 5;

function safeCodeEquals(expected: string, provided: string) {
  const expectedBuffer = Buffer.from(String(expected));
  const providedBuffer = Buffer.from(String(provided));
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

async function incrementCodeAttempts(email: string): Promise<number> {
  try {
    const { rows } = await db.query(
      "UPDATE verification_codes SET attempts = attempts + 1 WHERE email = $1 RETURNING attempts",
      [email]
    );
    return Number(rows[0]?.attempts ?? 1);
  } catch (error: any) {
    // 42703 = undefined column: the attempts column has not been migrated yet.
    // Add it on the fly so brute-force protection works without a manual patch.
    if (error?.code === "42703") {
      await db.query(
        "ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0"
      );
      const { rows } = await db.query(
        "UPDATE verification_codes SET attempts = attempts + 1 WHERE email = $1 RETURNING attempts",
        [email]
      );
      return Number(rows[0]?.attempts ?? 1);
    }
    throw error;
  }
}

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    const ipLimit = checkRateLimit(`login:${getClientIp(req)}`, 15, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: t("api.tooManyRequests") },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } }
      );
    }

    const { email, code } = await req.json();
    const normalizedEmail = normalizeEmailAddress(String(email ?? ""));
    const providedCode = String(code ?? "").trim();

    if (!normalizedEmail || !providedCode) {
      return NextResponse.json({ error: t("api.invalidCode") }, { status: 400 });
    }

    const { rows } = await db.query(
      "SELECT code, expires_at FROM verification_codes WHERE email = $1",
      [normalizedEmail]
    );
    const record = rows[0];

    if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: t("api.invalidCode") }, { status: 400 });
    }

    const attempts = await incrementCodeAttempts(normalizedEmail);
    if (attempts > MAX_CODE_ATTEMPTS) {
      await db.query("DELETE FROM verification_codes WHERE email = $1", [normalizedEmail]);
      return NextResponse.json({ error: t("api.tooManyCodeAttempts") }, { status: 429 });
    }

    if (!safeCodeEquals(record.code, providedCode)) {
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
