"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { primaryNav, site } from "@/content/site";
import { Logo } from "@/components/shell/Logo";
import { MissionSwitcher } from "@/components/shell/MissionSwitcher";
import { isActivePath } from "@/components/shell/nav-paths";
import { useUiStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

const MobileNav = dynamic(() => import("@/components/shell/MobileNav").then((m) => m.MobileNav), { ssr: false });

/**
 * Floating glass nav island: logo · primary links (active pill) · search · mission. The pill is plain CSS (fades and
 * settles in on navigation, static under reduced motion) so no animation library ships with every page.
 */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-6">
      <div className="bg-canvas/70 mx-auto flex h-14 max-w-[var(--max-content)] items-center gap-3 rounded-full border border-white/[0.08] pr-2 pl-4 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl md:pl-5">
        <Link href="/" className="shrink-0 rounded-full" aria-label={`${site.name} home`}>
          <Logo />
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden flex-1 lg:block">
          <ul className="flex items-center gap-0.5">
            {primaryNav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href} className="relative">
                  {active ? (
                    <span
                      aria-hidden
                      className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 absolute inset-0 rounded-full bg-white/[0.07] ring-1 ring-white/[0.08] motion-safe:duration-300"
                    />
                  ) : null}
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative block rounded-full px-3.5 py-1.5 text-sm transition-colors duration-150",
                      active ? "text-ink" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    <span className="xl:hidden">{item.short ?? item.label}</span>
                    <span className="hidden xl:inline">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="border-line text-ink-muted hover:border-line-strong hover:text-ink inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs transition-colors"
            aria-label="Search and ask (Control K)"
          >
            <Search className="size-3.5" strokeWidth={1.5} aria-hidden />
            <span className="hidden xl:inline">Search</span>
            <kbd className="border-line-strong text-2xs text-ink-faint hidden rounded border px-1 font-mono md:inline">
              ⌘K
            </kbd>
          </button>
          <MissionSwitcher compact />
          <button
            ref={menuButton}
            type="button"
            onClick={() => {
              setMenuLoaded(true);
              setMenuOpen(true);
            }}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="border-line text-ink-muted hover:text-ink inline-flex size-9 items-center justify-center rounded-full border transition-colors lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-4" strokeWidth={1.5} aria-hidden />
          </button>
          {menuLoaded ? (
            <MobileNav open={menuOpen} onOpenChange={setMenuOpen} pathname={pathname} trigger={menuButton} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
