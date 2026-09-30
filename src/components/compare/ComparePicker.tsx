"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COMPARE_COLORS, COMPARE_LETTERS, MAX_COMPARE } from "@/lib/compare";
import { cn } from "@/lib/utils";

type Option = { id: string; acronym: string; fullName: string; platform: string };

/** Selected experiments as removable chips + an "Add experiment" search popover. State lives in `?ids=`. */
export function ComparePicker({ options, selected }: { options: Option[]; selected: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const byId = new Map(options.map((o) => [o.id, o]));

  const update = (ids: string[]) => {
    const q = new URLSearchParams(params.toString());
    if (ids.length) q.set("ids", ids.join(","));
    else q.delete("ids");
    // Keep the list readable in the address bar (?ids=a,b) instead of URLSearchParams' %2C encoding.
    const qs = q.toString().replace(/%2C/gi, ",");
    startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      {selected.map((id, i) => {
        const o = byId.get(id);
        if (!o) return null;
        return (
          <span key={id} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-elev-1 pr-1.5 pl-1.5 text-sm text-ink">
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full font-mono text-xs font-medium text-canvas"
              style={{ background: COMPARE_COLORS[i] }}
            >
              {COMPARE_LETTERS[i]}
            </span>
            {o.acronym}
            <button
              type="button"
              onClick={() => update(selected.filter((x) => x !== id))}
              className="flex size-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
              aria-label={`Remove ${o.acronym} from the comparison`}
            >
              <X className="size-3.5" strokeWidth={1.75} />
            </button>
          </span>
        );
      })}

      {selected.length < MAX_COMPARE ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-sm text-ink-muted transition-colors hover:border-white/30 hover:text-ink active:scale-[0.98]"
            >
              <Plus className="size-4" strokeWidth={1.5} aria-hidden />
              Add experiment
              <span className="font-mono text-xs text-ink-faint">
                {selected.length}/{MAX_COMPARE}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] border-line bg-elev-2 p-0">
            <Command className="bg-transparent">
              <CommandInput placeholder="Search experiments…" />
              <CommandList className="max-h-72">
                <CommandEmpty>No experiment matches.</CommandEmpty>
                <CommandGroup>
                  {options
                    .filter((o) => !selected.includes(o.id))
                    .map((o) => (
                      <CommandItem
                        key={o.id}
                        value={`${o.acronym} ${o.fullName} ${o.platform}`}
                        onSelect={() => {
                          setOpen(false);
                          update([...selected, o.id]);
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-ink">{o.acronym}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {o.fullName} · {o.platform}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
