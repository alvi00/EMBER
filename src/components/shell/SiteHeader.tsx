"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Menu, Search } from "lucide-react";
import { primaryNav, site } from "@/content/site";
import { Logo } from "@/components/shell/Logo";
import { MissionSwitcher } from "@/components/shell/MissionSwitcher";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUiStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Floating glass nav island: logo · primary links (animated active pill) · search · mission. */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const reduce = useReducedMotion();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-6">
      <div className="mx-auto flex h-14 max-w-[var(--max-content)] items-center gap-3 rounded-full border border-white/[0.08] bg-canvas/70 pr-2 pl-4 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl md:pl-5">
        <Link href="/" className="shrink-0 rounded-full" aria-label={`${site.name} home`}>
          <Logo />
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden flex-1 lg:block">
          <LayoutGroup>
            <ul className="flex items-center gap-0.5">
              {primaryNav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href} className="relative">
                    {active ? (
                      <motion.span
                        layoutId="nav-active"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-white/[0.07] ring-1 ring-white/[0.08]"
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
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
          </LayoutGroup>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3 text-xs text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            aria-label="Search and ask (Control K)"
          >
            <Search className="size-3.5" strokeWidth={1.5} aria-hidden />
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden rounded border border-line-strong px-1 font-mono text-2xs text-ink-faint md:inline">⌘K</kbd>
          </button>
          <MissionSwitcher compact />
          <Sheet>
            <SheetTrigger
              className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:text-ink lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" strokeWidth={1.5} />
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl border-line bg-elev-2 pb-8">
              <div className="px-6 pt-6">
                <SheetTitle className="font-display text-3xl font-normal">Navigate</SheetTitle>
                <SheetDescription className="text-ink-muted">{site.expansion}</SheetDescription>
              </div>
              <nav aria-label="Mobile" className="px-4">
                <ul className="grid grid-cols-2 gap-2">
                  {[{ href: "/", label: "Home" }, ...primaryNav, { href: "/about", label: "About" }].map((item) => {
                    const active = item.href === "/" ? pathname === "/" : isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 items-center rounded-xl border px-4 text-sm transition-colors",
                            active
                              ? "border-flame-micro/40 bg-flame-micro/10 text-ink"
                              : "border-line text-ink-muted hover:text-ink",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
