"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { primaryNav, site } from "@/content/site";
import { Logo } from "@/components/shell/Logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ slot }: { slot?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/60">
      <div className="container-ember flex h-[var(--nav-h)] items-center gap-6">
        <Link href="/" className="shrink-0 rounded-md" aria-label={`${site.name} home`}>
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-full px-3 py-1.5 text-sm transition-colors duration-150",
                      active ? "text-ink" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {item.label}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 -bottom-[13px] h-px bg-[image:var(--flame-gradient)]"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {slot}
          <Sheet>
            <SheetTrigger
              className="inline-flex size-10 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:text-ink lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" strokeWidth={1.5} />
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
