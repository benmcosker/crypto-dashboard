// A tiny bridge so non-React code (e.g. the TanStack Query cache) can raise UI
// notifications. The NotificationsProvider registers a handler on mount; calls
// made before registration are silently dropped.

export type Severity = "error" | "warning" | "info" | "success";

export interface Notification {
  message: string;
  severity: Severity;
}

type Handler = (n: Notification) => void;

let handler: Handler | null = null;

export function setNotifyHandler(h: Handler | null): void {
  handler = h;
}

export function notify(message: string, severity: Severity = "error"): void {
  handler?.({ message, severity });
}
