import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Defense in depth: real authorization happens in each route via requireAdmin().
// The middleware rejects obviously invalid requests before they reach handlers.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin APIs so guests cannot access even if they know the URL.
  // Allow verify-secret so the login page can work.
  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/verify-secret")) {
    const token = req.cookies.get("admin_verified")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
        algorithms: ["HS256"],
      });
      if (payload.kind !== "admin_verification") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"]
};
