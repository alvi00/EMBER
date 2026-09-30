import { buildCatalog } from "@/lib/catalog";

// Built once at build time: the full client catalogue (source metadata, findings and glossary for ⌘K and the drawer).
export const dynamic = "force-static";

/** GET /api/catalog → the full client-safe catalogue, fetched on first use instead of shipping with every page. */
export function GET() {
  return Response.json(buildCatalog(), { headers: { "cache-control": "public, max-age=3600" } });
}
