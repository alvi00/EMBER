"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { TOASTER_EVENT } from "@/lib/notify";

const Toaster = dynamic(() => import("@/components/ui/sonner").then((m) => m.Toaster), { ssr: false });

/** Mounts the toaster only once something has been announced; until then no toast code is downloaded. */
export function ToastHost() {
  const [needed, setNeeded] = useState(false);
  useEffect(() => {
    const onNotice = () => setNeeded(true);
    window.addEventListener(TOASTER_EVENT, onNotice, { once: true });
    return () => window.removeEventListener(TOASTER_EVENT, onNotice);
  }, []);
  return needed ? <Toaster position="bottom-center" /> : null;
}
