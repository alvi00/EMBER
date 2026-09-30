import Link from "next/link";
import { footerNav, site } from "@/content/site";
import { Logo } from "@/components/shell/Logo";

export function SiteFooter({ provenance }: { provenance?: React.ReactNode }) {
  return (
    <footer className="border-line relative z-10 mt-24 border-t">
      <div className="container-ember grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="text-ink-muted mt-4 max-w-md text-sm leading-relaxed">{site.tagline}</p>
          <p className="text-ink-muted mt-6 max-w-md text-xs leading-relaxed">{provenance ?? site.provenance}</p>
        </div>
        <nav aria-label="Footer" className="md:col-span-4 md:col-start-7">
          <p className="eyebrow">Explore</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink-muted hover:text-ink transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-2">
          <p className="eyebrow">Built for</p>
          <p className="text-ink-muted mt-4 text-sm">{site.challenge}</p>
        </div>
      </div>
      <div className="border-line border-t">
        <div className="container-ember text-ink-muted flex flex-col gap-2 py-5 text-xs md:flex-row md:items-center md:justify-between">
          <p>{site.disclaimer}</p>
          <p className="font-mono">
            {site.name} · {site.expansion}
          </p>
        </div>
      </div>
    </footer>
  );
}
