import { ReactNode } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";

interface Props {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: unknown;
  children: ReactNode;
  action?: ReactNode;
}

// Consistent card shell with title, optional action, and loading/error states.
export default function WidgetCard({
  title,
  subtitle,
  isLoading,
  error,
  children,
  action,
}: Props) {
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
        ) : error ? (
          <Alert severity="error">
            {error instanceof Error ? error.message : "Failed to load data"}
          </Alert>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
