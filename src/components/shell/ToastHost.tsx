"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { NOTICE_EVENT, type Notice } from "@/lib/notify";

const LiveToaster = dynamic(() => import("@/components/shell/LiveToaster").then((m) => m.LiveToaster), { ssr: false });

/** Mounts the toaster only once something has been announced; until then no toast code is downloaded. */
export function ToastHost() {
  const [notices, setNotices] = useState<Notice[]>([]);
  useEffect(() => {
    const onNotice = (e: Event) => setNotices((prev) => [...prev, (e as CustomEvent<Notice>).detail]);
    window.addEventListener(NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(NOTICE_EVENT, onNotice);
  }, []);
  return notices.length ? <LiveToaster notices={notices} /> : null;
}
