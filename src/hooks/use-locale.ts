"use client";

import { useSyncExternalStore } from "react";
import type { Locale } from "@/content/i18n";

const STORAGE_KEY = "ember-locale";
const LOCALE_EVENT = "ember:locale";

function read(): Locale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(LOCALE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LOCALE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The visitor's UI language. English on the server and during hydration, so pages stay static and never mismatch. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => "en");
}

export function setLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
  window.dispatchEvent(new Event(LOCALE_EVENT));
}
