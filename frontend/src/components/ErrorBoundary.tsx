import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Button, Container, Typography } from "@mui/material";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it so a single broken widget can't
 * blank the whole app. Shows a recoverable fallback with a reload action.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Something went wrong
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            The dashboard hit an unexpected error and couldn't render this view.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button variant="outlined" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          </Box>
        </Container>
      );
    }
    return this.props.children;
  }
}
