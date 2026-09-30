import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Dev-only surfaces (/review, /styleguide and their API) must not exist in production (project.md §5).
 * Rewriting to an unknown path serves the custom not-found page with a real 404 status.
 */
export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.rewrite(new URL("/__dev-only-not-found", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/review/:path*", "/styleguide/:path*", "/api/review/:path*"],
};
