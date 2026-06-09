import { type ReactNode } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ApiError } from "../api/client";

interface Props {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: unknown;
  /** Called when the user clicks Retry in the error state. */
  onRetry?: () => void;
  /** True while a retry/refetch is in flight (disables the Retry button). */
  isRefetching?: boolean;
  children: ReactNode;
  action?: ReactNode;
}

function describe(error: unknown): { title: string; message: string; severity: "error" | "warning" } {
  if (error instanceof ApiError) {
    if (error.isRateLimited) {
      return { title: "Rate limited", message: error.message, severity: "warning" };
    }
    if (error.isNetwork) {
      return { title: "Can't reach the server", message: error.message, severity: "error" };
    }
    return { title: "Couldn't load data", message: error.message, severity: "error" };
  }
  if (error instanceof Error) {
    return { title: "Couldn't load data", message: error.message, severity: "error" };
  }
  return { title: "Couldn't load data", message: "Something went wrong.", severity: "error" };
}

// Consistent card shell with title, optional action, and loading/error states.
export default function WidgetCard({
  title,
  subtitle,
  isLoading,
  error,
  onRetry,
  isRefetching,
  children,
  action,
}: Props) {
  const desc = error ? describe(error) : null;

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : desc ? (
          <Alert
            severity={desc.severity}
            action={
              onRetry && (
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={onRetry}
                  disabled={isRefetching}
                >
                  {isRefetching ? "Retrying…" : "Retry"}
                </Button>
              )
            }
          >
            <AlertTitle>{desc.title}</AlertTitle>
            {desc.message}
          </Alert>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
