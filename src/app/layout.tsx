import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Noto_Sans_Bengali, Noto_Serif_Bengali } from "next/font/google";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { Overlays } from "@/components/shell/Overlays";
import { CatalogProvider } from "@/components/providers/CatalogProvider";
import { buildCoreCatalog } from "@/lib/catalog";
import { datasetStats } from "@/lib/data";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastHost } from "@/components/shell/ToastHost";
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

// Bengali faces for the optional বাংলা copy. Not preloaded and limited to the Bengali unicode range, so browsers only
// download them when Bengali text is on screen.
const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-bengali-sans",
  subsets: ["bengali"],
  display: "swap",
  preload: false,
});

const notoSerifBengali = Noto_Serif_Bengali({
  variable: "--font-bengali-serif",
  subsets: ["bengali"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: `${site.name} · Fire in freefall, ranked for your mission`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    title: `${site.name}: ${site.expansion}`,
    description: site.description,
    type: "website",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name}: ${site.expansion}`,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#05060A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const catalog = buildCoreCatalog();
  const stats = datasetStats();
  const provenance = `${stats.investigations} investigations, ${stats.findings} findings and ${stats.testPoints} test points drawn from ${stats.sources} NASA sources (Physical Sciences Informatics and the Technical Reports Server). Every finding links to its source.`;
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${notoSansBengali.variable} ${notoSerifBengali.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="bg-elev-2 sr-only z-50 rounded-md px-4 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <CatalogProvider catalog={catalog}>
          <TooltipProvider delayDuration={200}>
            <SiteHeader />
            {/* min-height keeps the footer below the fold on short pages. */}
            <main id="main" className="relative z-10 min-h-[100dvh] flex-1">
              {children}
            </main>
            <SiteFooter provenance={provenance} />
            <Suspense fallback={null}>
              <Overlays />
            </Suspense>
          </TooltipProvider>
        </CatalogProvider>
        <ToastHost />
      </body>
    </html>
  );
}
