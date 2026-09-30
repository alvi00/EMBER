"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, FlaskConical, LayoutGrid, MessageCircleQuestion, ScrollText } from "lucide-react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { primaryNav } from "@/content/site";
import { useUiStore } from "@/lib/stores";
import { truncate } from "@/lib/text";

/** ⌘K / Ctrl+K: search experiments, findings and glossary, jump to pages, or ask the copilot. */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const openAsk = useUiStore((s) => s.openAsk);
  const { experiments, findings, glossary, experimentById } = useCatalog();
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUiStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="border-line bg-elev-2 top-[18%] translate-y-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Search EMBER</DialogTitle>
        <DialogDescription className="sr-only">
          Search experiments, findings and glossary terms, or ask the evidence copilot.
        </DialogDescription>
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search experiments, findings, terms… or type a question"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No matches. Press Enter on “Ask the Flame” to ask instead.</CommandEmpty>
            {query.trim().length > 2 ? (
              <CommandGroup heading="Copilot" forceMount>
                <CommandItem
                  value={`ask ${query}`}
                  forceMount
                  onSelect={() => {
                    setOpen(false);
                    // On /ask the page itself answers; elsewhere the mini-ask sheet streams the answer in place.
                    if (pathname?.startsWith("/ask")) router.push(`/ask?q=${encodeURIComponent(query.trim())}`);
                    else openAsk(query.trim(), true);
                    setQuery("");
                  }}
                >
                  <MessageCircleQuestion className="text-flame-violet-text" strokeWidth={1.5} />
                  <span className="truncate">
                    Ask the Flame: <span className="text-ink">{query.trim()}</span>
                  </span>
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup heading="Pages">
              {[{ href: "/", label: "Home" }, ...primaryNav, { href: "/about", label: "About" }].map((p) => (
                <CommandItem key={p.href} value={`page ${p.label}`} onSelect={() => go(p.href)}>
                  <LayoutGrid strokeWidth={1.5} />
                  {p.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Experiments">
              {experiments.map((e) => (
                <CommandItem
                  key={e.id}
                  value={`experiment ${e.acronym} ${e.fullName} ${e.platform}`}
                  onSelect={() => go(`/experiments/${e.id}`)}
                >
                  <FlaskConical strokeWidth={1.5} />
                  <span className="font-medium">{e.acronym}</span>
                  <span className="text-ink-muted truncate">{e.fullName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Findings">
              {findings.map((f) => (
                <CommandItem
                  key={f.id}
                  value={`finding ${f.statement} ${experimentById.get(f.experimentId)?.acronym ?? ""} ${f.category}`}
                  onSelect={() => go(`/experiments/${f.experimentId}?tab=findings#${f.id}`)}
                >
                  <ScrollText strokeWidth={1.5} />
                  <span className="truncate">{truncate(f.statement, 110)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Glossary">
              {glossary.map((g) => (
                <CommandItem
                  key={g.id}
                  value={`term ${g.term} ${g.short}`}
                  onSelect={() => go(`/methods#term-${g.id}`)}
                >
                  <BookOpen strokeWidth={1.5} />
                  <span className="font-medium">{g.term}</span>
                  <span className="text-ink-muted truncate">{g.short}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
