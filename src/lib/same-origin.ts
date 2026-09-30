/**
 * Guards for state-changing or quota-spending POST routes: the body must be JSON (so browsers send a CORS preflight
 * for cross-site requests) and any Origin header must match the request host.
 */
export function rejectCrossSite(request: Request): Response | null {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    return Response.json({ error: "Send the request as application/json." }, { status: 415 });
  }
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return Response.json({ error: "Cross-site request refused." }, { status: 403 });
    } catch {
      return Response.json({ error: "Bad origin." }, { status: 403 });
    }
  }
  return null;
}
