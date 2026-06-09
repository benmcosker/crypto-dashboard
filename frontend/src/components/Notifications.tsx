import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import {
  setNotifyHandler,
  type Notification,
  type Severity,
} from "../notify";

interface Props {
  children: React.ReactNode;
}

/**
 * Global snackbar host. Registers itself with the notify() bridge so any part of
 * the app (including the query cache) can surface a toast. Identical messages are
 * de-duplicated within a short window so a single backend outage doesn't stack
 * five copies of the same toast.
 */
export default function NotificationsProvider({ children }: Props) {
  const [current, setCurrent] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);
  const recent = useRef<Map<string, number>>(new Map());

  const show = useCallback((n: Notification) => {
    const now = Date.now();
    const last = recent.current.get(n.message) ?? 0;
    if (now - last < 4000) return; // suppress duplicate within 4s
    recent.current.set(n.message, now);
    setCurrent(n);
    setOpen(true);
  }, []);

  useEffect(() => {
    setNotifyHandler(show);
    return () => setNotifyHandler(null);
  }, [show]);

  return (
    <>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={(_, reason) => {
          if (reason !== "clickaway") setOpen(false);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={(current?.severity as Severity) ?? "error"}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{ width: "100%" }}
        >
          {current?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
