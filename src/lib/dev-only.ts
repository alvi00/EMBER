import { notFound } from "next/navigation";

/** Dev-only routes (/review, /styleguide) must 404 in production builds (project.md §5). */
export function assertDevOnly() {
  if (process.env.NODE_ENV === "production") notFound();
}

export const isDev = process.env.NODE_ENV !== "production";
