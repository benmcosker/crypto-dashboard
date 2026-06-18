import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import App from "./App";
import theme from "./theme";
import { ApiError } from "./api/client";
import { notify } from "./notify";
import NotificationsProvider from "./components/Notifications";
import ErrorBoundary from "./components/ErrorBoundary";

// Under Cypress we disable retries so error states surface immediately and
// deterministically; in the real app transient failures still retry (below).
const isCypress = typeof window !== "undefined" && "Cypress" in window;

const queryClient = new QueryClient({
  // Surface any failed query as a single toast (deduped by the provider). Cards
  // still render their own inline error + Retry; this is the global heads-up.
  queryCache: new QueryCache({
    onError: (error) => {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Something went wrong while loading data.";
      const severity =
        error instanceof ApiError && error.isRateLimited ? "warning" : "error";
      notify(message, severity);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors (4xx incl. 429); retry transient
      // network/5xx failures a couple of times with backoff.
      retry: (failureCount, error) => {
        if (isCypress) return false;
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <NotificationsProvider>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </NotificationsProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>,
);
