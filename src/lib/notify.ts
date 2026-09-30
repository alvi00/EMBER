/**
 * Toasts without shipping the toast library on every page: the first notice asks `ToastHost` (root layout) to mount
 * the Sonner toaster, and the toast itself is sent through a lazily imported `sonner`. Sonner replays active toasts
 * to a toaster that subscribes late, so nothing sent while the toaster loads is lost.
 */
export const TOASTER_EVENT = "ember:toaster";

export function notify(kind: "success" | "error", message: string) {
  window.dispatchEvent(new Event(TOASTER_EVENT));
  void import("sonner").then(({ toast }) => toast[kind](message));
}
