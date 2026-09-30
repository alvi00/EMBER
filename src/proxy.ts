import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import experimentsJson from "../data/processed/experiments.json";

const experimentIds = new Set((experimentsJson as { id: string }[]).map((e) => e.id));

/**
 * Rewriting to an unknown path serves the custom not-found page with a real 404 status.
 * - Dev-only surfaces (/review, /styleguide and their API) must not exist in production (project.md §5).
 * - Unknown experiment ids are answered here: with `dynamicParams = false` Next 16 still returns 404 for them, but it
 *   logs an internal "NoFallbackError" on the server for every such request.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/experiments/")) {
    const raw = pathname.slice("/experiments/".length).replace(/\/$/, "");
    let id = raw;
    try {
      id = decodeURIComponent(raw);
    } catch {
      // Malformed escapes are simply unknown ids.
    }
    return experimentIds.has(id) ? NextResponse.next() : NextResponse.rewrite(new URL("/__unknown-experiment", request.url));
  }
  if (process.env.NODE_ENV === "production") {
    return NextResponse.rewrite(new URL("/__dev-only-not-found", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/experiments/:id", "/review/:path*", "/styleguide/:path*", "/api/review/:path*"],
};
