"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { useSourceDrawer, useUiStore } from "@/lib/stores";

// Heavy overlays load on first use, not with every page: cmdk, the answer renderer and the drawer stay out of the
// initial bundle. Once opened they stay mounted so close animations and state survive.
const CommandPalette = dynamic(() => import("@/components/shell/CommandPalette").then((m) => m.CommandPalette), { ssr: false });
const SourceDrawer = dynamic(() => import("@/components/shell/SourceDrawer").then((m) => m.SourceDrawer), { ssr: false });
const AskSheet = dynamic(() => import("@/components/shell/AskSheet").then((m) => m.AskSheet), { ssr: false });

/** Global overlays: ⌘K palette, source drawer, floating Ask button + mini-ask sheet. */
export function Overlays() {
  const pathname = usePathname();
  const paletteOpen = useUiStore((s) => s.paletteOpen);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const askOpen = useUiStore((s) => s.askOpen);
  const openAsk = useUiStore((s) => s.openAsk);
  const drawerOpen = useSourceDrawer((s) => s.target !== null);

  const [loaded, setLoaded] = useState({ palette: false, ask: false, drawer: false });
  if ((paletteOpen && !loaded.palette) || (askOpen && !loaded.ask) || (drawerOpen && !loaded.drawer)) {
    setLoaded({ palette: loaded.palette || paletteOpen, ask: loaded.ask || askOpen, drawer: loaded.drawer || drawerOpen });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!useUiStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  const onAsk = pathname?.startsWith("/ask");

  return (
    <>
      {loaded.palette ? <CommandPalette /> : null}
      {loaded.drawer ? <SourceDrawer /> : null}
      {!onAsk ? (
        <button
          type="button"
          onClick={() => openAsk()}
          className="group fixed right-4 bottom-4 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-elev-2/85 pr-5 pl-2 text-sm text-ink shadow-[0_12px_40px_-12px_rgba(123,97,255,0.45)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] md:right-6 md:bottom-6"
          aria-label="Ask the Flame"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-flame-violet/20 text-flame-violet-text">
            <MessageCircleQuestion className="size-4" strokeWidth={1.5} aria-hidden />
          </span>
          Ask
        </button>
      ) : null}
      {loaded.ask && !onAsk ? <AskSheet /> : null}
    </>
  );
}
