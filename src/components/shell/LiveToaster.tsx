"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import type { Notice } from "@/lib/notify";

/** The Sonner toaster plus a queue flush: shows each notice once, including the ones sent while this chunk loaded. */
export function LiveToaster({ notices }: { notices: Notice[] }) {
  const shown = useRef(0);
  useEffect(() => {
    // Child effects run first, so the Toaster is already subscribed when these fire.
    for (const n of notices.slice(shown.current)) toast[n.kind](n.message);
    shown.current = notices.length;
  }, [notices]);
  return <Toaster position="bottom-center" />;
}
