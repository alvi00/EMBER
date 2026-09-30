"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Square, Volume2 } from "lucide-react";
import type { MissionId } from "@/lib/schema";
import { cn } from "@/lib/utils";

const NARRATION_EVENT = "ember:narration";
const noopSubscribe = () => () => {};

/** The saved digest as speakable sentences: citation markers and Markdown removed, nothing added. */
function toSentences(text: string): string[] {
  return text
    .replace(/\[\[S\d+\]\]/g, "")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .filter(Boolean);
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  // On-device voices keep narration working with the network off.
  return voices.find((v) => v.localService) ?? voices[0];
}

/**
 * Narrated mission scenario (project.md Phase 11 stretch): reads the mission's saved evidence digest aloud with the
 * browser's own speech engine and shows the sentence being read. The digest is the same cited text Mission Control
 * shows; the narration only drops the citation markers, and the card links to the cited version.
 */
export function MissionBriefing({ missionId, label }: { missionId: MissionId; label: string }) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false,
  );
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [caption, setCaption] = useState("");
  const active = useRef(false);

  const stop = () => {
    active.current = false;
    window.speechSynthesis.cancel();
    setState("idle");
    setCaption("");
  };

  useEffect(() => {
    // Only one briefing speaks at a time: another card starting resets this one.
    const onOther = (e: Event) => {
      if ((e as CustomEvent<MissionId>).detail !== missionId && active.current) {
        active.current = false;
        setState("idle");
        setCaption("");
      }
    };
    window.addEventListener(NARRATION_EVENT, onOther);
    return () => {
      window.removeEventListener(NARRATION_EVENT, onOther);
      if (active.current) window.speechSynthesis.cancel();
    };
  }, [missionId]);

  const play = async () => {
    window.dispatchEvent(new CustomEvent<MissionId>(NARRATION_EVENT, { detail: missionId }));
    window.speechSynthesis.cancel();
    active.current = true;
    setState("loading");
    try {
      const res = await fetch(`/api/summarize?mission=${missionId}`);
      const body = (await res.json()) as { mode: string; text?: string };
      if (!res.ok || body.mode === "none" || !body.text) throw new Error("No saved briefing");
      if (!active.current) return;
      const sentences = [`${label} briefing.`, ...toSentences(body.text)];
      const voice = pickVoice();
      setState("playing");
      setCaption(sentences[0]);
      sentences.forEach((sentence, i) => {
        const u = new SpeechSynthesisUtterance(sentence);
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? "en-US";
        u.rate = 1;
        u.onstart = () => active.current && setCaption(sentence);
        if (i === sentences.length - 1) {
          u.onend = () => {
            if (!active.current) return;
            active.current = false;
            setState("idle");
            setCaption("");
          };
        }
        window.speechSynthesis.speak(u);
      });
    } catch {
      active.current = false;
      setState("error");
      setCaption("");
    }
  };

  if (!supported) return null;
  const playing = state === "playing" || state === "loading";
  return (
    <div className="border-line relative z-10 mt-5 border-t pt-4">
      <button
        type="button"
        onClick={playing ? stop : play}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs transition-colors",
          playing
            ? "border-flame-micro/50 bg-flame-micro/10 text-ink"
            : "border-line-strong text-ink-muted hover:text-ink",
        )}
      >
        {playing ? (
          <Square className="size-3.5" strokeWidth={1.5} aria-hidden />
        ) : (
          <Volume2 className="size-3.5" strokeWidth={1.5} aria-hidden />
        )}
        {playing ? "Stop the briefing" : "Listen to the briefing"}
        <span className="sr-only">for {label}</span>
      </button>
      {state === "playing" && caption ? (
        <div className="mt-3">
          <p className="text-ink text-sm leading-relaxed" data-testid="briefing-caption">
            {caption}
          </p>
          <p className="text-ink-muted mt-2 text-xs">
            Read aloud from the saved AI digest of AI-draft findings.{" "}
            <Link href={`/dashboard?mission=${missionId}`} className="hover:text-ink underline underline-offset-2">
              See every sentence&apos;s source
            </Link>
          </p>
        </div>
      ) : null}
      {state === "error" ? (
        <p className="text-ink-muted mt-3 text-xs">No saved briefing for this mission yet.</p>
      ) : null}
    </div>
  );
}
