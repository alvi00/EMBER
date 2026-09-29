import Link from "next/link";
import { footerNav, site } from "@/content/site";
import { Logo } from "@/components/shell/Logo";

export function SiteFooter({ provenance }: { provenance?: React.ReactNode }) {
  return (
    <footer className="relative z-10 mt-24 border-t border-line">
      <div className="container-ember grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">{site.tagline}</p>
          <p className="mt-6 max-w-md text-xs leading-relaxed text-ink-muted">{provenance ?? site.provenance}</p>
        </div>
        <nav aria-label="Footer" className="md:col-span-4 md:col-start-7">
          <p className="eyebrow">Explore</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink-muted transition-colors hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-2">
          <p className="eyebrow">Built for</p>
          <p className="mt-4 text-sm text-ink-muted">{site.challenge}</p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-ember flex flex-col gap-2 py-5 text-xs text-ink-muted md:flex-row md:items-center md:justify-between">
          <p>{site.disclaimer}</p>
          <p className="font-mono">
            {site.name} · {site.expansion}
          </p>
        </div>
      </div>
    </footer>
  );
}
