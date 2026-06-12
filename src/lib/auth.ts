import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/adminConfig";

let cachedSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable must be set to a random string of at least 32 characters"
    );
  }
  cachedSecret = new TextEncoder().encode(value);
  return cachedSecret;
}
const ADMIN_VERIFICATION_COOKIE = "admin_verified";
const ADMIN_VERIFICATION_EXPIRES_IN_SECONDS = 12 * 60 * 60;

export type AuthPayload = {
  userId: string;
  role: "USER" | "ADMIN";
  email: string;
};

type AdminVerificationPayload = {
  kind: "admin_verification";
  userId: string;
  email: string;
};

export async function encrypt(payload: AuthPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function decrypt(input: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(input, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    return payload as AuthPayload;
  } catch (e) {
    return null;
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  const payload = await decrypt(session);
  if (!payload) return null;

  return {
    ...payload,
    role: isAdminEmail(payload.email) ? "ADMIN" : "USER",
  };
}

export async function setSession(payload: AuthPayload) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const session = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", { expires: new Date(0) });
  cookieStore.set(ADMIN_VERIFICATION_COOKIE, "", { expires: new Date(0), path: "/" });
}

export async function isAdminVerifiedForSession(session: AuthPayload | null) {
  if (!session) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_VERIFICATION_COOKIE)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    const verifiedPayload = payload as AdminVerificationPayload;
    return (
      verifiedPayload.kind === "admin_verification" &&
      verifiedPayload.userId === session.userId &&
      verifiedPayload.email === session.email
    );
  } catch {
    return false;
  }
}

export async function setAdminVerified(session: AuthPayload) {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + ADMIN_VERIFICATION_EXPIRES_IN_SECONDS * 1000);
  const token = await new SignJWT({
    kind: "admin_verification",
    userId: session.userId,
    email: session.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_VERIFICATION_EXPIRES_IN_SECONDS}s`)
    .sign(getJwtSecret());

  cookieStore.set(ADMIN_VERIFICATION_COOKIE, token, {
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/"
  });
}
