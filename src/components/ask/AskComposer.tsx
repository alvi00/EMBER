"use client";

import { forwardRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { askCopy } from "@/content/ask";
import { cn } from "@/lib/utils";

/** Question input shared by /ask and the mini-ask sheet. Enter asks, Shift+Enter adds a line. */
export const AskComposer = forwardRef<
  HTMLTextAreaElement,
  {
    id: string;
    value: string;
    onChange: (v: string) => void;
    onSubmit: (q: string) => void;
    onStop?: () => void;
    busy?: boolean;
    rows?: number;
    className?: string;
  }
>(function AskComposer({ id, value, onChange, onSubmit, onStop, busy = false, rows = 2, className }, ref) {
  const [touched, setTouched] = useState(false);
  const tooShort = touched && value.trim().length > 0 && value.trim().length < 3;
  const submit = () => {
    setTouched(true);
    if (value.trim().length >= 3 && !busy) onSubmit(value.trim());
  };
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Your question
      </label>
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border bg-elev-1 p-2 transition-colors duration-200 focus-within:border-flame-micro/60",
          tooShort ? "border-danger/50" : "border-line-strong",
        )}
      >
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          maxLength={500}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          aria-describedby={`${id}-help`}
          aria-invalid={tooShort || undefined}
          placeholder={askCopy.placeholder}
          className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        {busy && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink transition-transform active:scale-95"
            aria-label="Stop answering"
          >
            <Square className="size-3.5 fill-current" strokeWidth={1.5} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim() || busy}
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-[opacity,transform] duration-200 active:scale-95",
              (!value.trim() || busy) && "opacity-40",
            )}
            aria-label="Ask"
          >
            <ArrowUp className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
      <p id={`${id}-help`} className={cn("mt-1.5 px-1 text-xs", tooShort ? "text-danger" : "text-ink-faint")}>
        {tooShort ? "Ask a slightly longer question." : "Enter to ask · Shift + Enter for a new line"}
      </p>
    </form>
  );
});
