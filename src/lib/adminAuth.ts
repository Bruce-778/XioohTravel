import { isAdminEmail } from "./adminConfig";
import { getSession, isAdminVerifiedForSession } from "./auth";

export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "api.unauthorized", status: 401 };
  }

  if (session.role !== "ADMIN" || !isAdminEmail(session.email)) {
    return { ok: false as const, error: "api.forbidden", status: 403 };
  }

  const verified = await isAdminVerifiedForSession(session);
  if (!verified) {
    return { ok: false as const, error: "api.unauthorized", status: 401 };
  }

  return { ok: true as const, error: null, status: 200 };
}

