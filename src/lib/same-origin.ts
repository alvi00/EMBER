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
  if (!origin) return null;
  let sameHost = false;
  try {
    sameHost = new URL(origin).host === new URL(request.url).host;
  } catch {
    // An unparsable Origin is treated as cross-site.
  }
  return sameHost ? null : Response.json({ error: "Cross-site request refused." }, { status: 403 });
}
