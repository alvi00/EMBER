"use client";

import { Languages } from "lucide-react";
import { translate, type UiKey } from "@/content/i18n";
import { setLocale, useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

/** Translated UI text. Renders English on the server; Bengali is marked `lang="bn"` for screen readers and fonts. */
export function T({ k, vars }: { k: UiKey; vars?: Record<string, string | number> }) {
  const locale = useLocale();
  const text = translate(locale, k, vars);
  return locale === "bn" ? <span lang="bn">{text}</span> : <>{text}</>;
}

/** EN ⇄ বাংলা switch for the key UI copy. */
export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const next = locale === "bn" ? "en" : "bn";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={locale === "bn" ? "Show key text in English" : "Show key text in Bengali"}
      className={cn(
        "border-line text-ink-muted hover:border-line-strong hover:text-ink inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
        className,
      )}
    >
      <Languages className="size-3.5" strokeWidth={1.5} aria-hidden />
      {locale === "bn" ? <span lang="en">EN</span> : <span lang="bn">বাংলা</span>}
    </button>
  );
}
