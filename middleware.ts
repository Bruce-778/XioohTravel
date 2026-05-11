import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin APIs so guests cannot access even if they know the URL.
  // Allow verify-secret so the login page can work.
  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/verify-secret")) {
    const hasAdminVerification = Boolean(req.cookies.get("admin_verified")?.value);
    if (!hasAdminVerification) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"]
};

