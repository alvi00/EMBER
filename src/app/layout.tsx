import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { SourceDrawer } from "@/components/shell/SourceDrawer";
import { FloatingAsk } from "@/components/shell/FloatingAsk";
import { CatalogProvider } from "@/components/providers/CatalogProvider";
import { buildCatalog } from "@/lib/catalog";
import { datasetStats } from "@/lib/data";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { site } from "@/content/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: `${site.name} — Fire in freefall, ranked for your mission`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    title: `${site.name} — ${site.expansion}`,
    description: site.description,
    type: "website",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.expansion}`,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#05060A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const catalog = buildCatalog();
  const stats = datasetStats();
  const provenance = `${stats.investigations} investigations, ${stats.findings} findings and ${stats.testPoints} test points drawn from ${stats.sources} NASA sources (Physical Sciences Informatics and the Technical Reports Server). Every finding links to its source.`;
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-elev-2 px-4 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <CatalogProvider catalog={catalog}>
          <TooltipProvider delayDuration={200}>
            <SiteHeader />
            <main id="main" className="relative z-10 flex-1">
              {children}
            </main>
            <SiteFooter provenance={provenance} />
            <CommandPalette />
            <SourceDrawer />
            <FloatingAsk />
          </TooltipProvider>
        </CatalogProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
