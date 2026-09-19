import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy runs before requests hit app routes; used to gate dashboard access.
export async function proxy(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DRY_RUN === "true") {
    return NextResponse.next();
  }

  const token = await getToken({ req: req as any });

  if (!token && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
