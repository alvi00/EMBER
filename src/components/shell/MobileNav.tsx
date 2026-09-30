"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { allPagesNav, site } from "@/content/site";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isActivePath } from "@/components/shell/nav-paths";
import { LocaleToggle, T } from "@/components/ember/T";
import { NAV_KEY } from "@/content/i18n";

/** Mobile bottom-sheet navigation. Loaded on the first tap of the menu button, so the dialog code is not in every page. */
export function MobileNav({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname() ?? "/";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="border-line bg-elev-2 rounded-t-3xl pb-8"
        onCloseAutoFocus={(e) => {
          // The menu button lives outside the dialog tree, so return focus to it explicitly.
          e.preventDefault();
          trigger.current?.focus();
        }}
      >
        <div className="px-6 pt-6">
          <SheetTitle className="font-display text-3xl font-normal">Navigate</SheetTitle>
          <SheetDescription className="text-ink-muted">{site.expansion}</SheetDescription>
        </div>
        <nav aria-label="Mobile" className="px-4">
          <ul className="grid grid-cols-2 gap-2">
            {allPagesNav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex min-h-12 items-center rounded-xl border px-4 text-sm transition-colors",
                      active
                        ? "border-flame-micro/40 bg-flame-micro/10 text-ink"
                        : "border-line text-ink-muted hover:text-ink",
                    )}
                  >
                    <T k={NAV_KEY[item.href].label} />
                  </Link>
                </li>
              );
            })}
          </ul>
          <LocaleToggle className="mt-4" />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
