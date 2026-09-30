/**
 * Toasts without shipping the toast library on every page: callers dispatch a notice, and `ToastHost` (root layout)
 * loads the Sonner toaster on the first one and shows it and every later notice.
 */
export type Notice = { kind: "success" | "error"; message: string };

export const NOTICE_EVENT = "ember:notice";

export function notify(kind: Notice["kind"], message: string) {
  window.dispatchEvent(new CustomEvent<Notice>(NOTICE_EVENT, { detail: { kind, message } }));
}
