import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ApiError, fetchGlobal } from "../api/client";
import { formatCompact } from "../utils/format";
import PercentChange from "./PercentChange";

interface Stat {
  label: string;
  value: string;
  change?: number;
}

function StatCard({ label, value, change }: Stat) {
  return (
    <Card sx={{ flex: "1 1 180px", minWidth: 160 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        {change !== undefined && (
          <Box sx={{ mt: 0.5 }}>
            <PercentChange value={change} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Metric 2: Market cap & dominance — high-level "state of the market".
// /global is a live snapshot, so it is independent of the period filter.
export default function MarketOverview() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["global"],
    queryFn: fetchGlobal,
  });

  if (error) {
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : "Couldn't load the market overview.";
    const severity = error instanceof ApiError && error.isRateLimited ? "warning" : "error";
    return (
      <Alert
        severity={severity}
        action={
          <Button
            color="inherit"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? "Retrying…" : "Retry"}
          </Button>
        }
      >
        <AlertTitle>Couldn't load market overview</AlertTitle>
        {message}
      </Alert>
    );
  }

  if (isLoading || !data) {
    // Skeleton row keeps layout height stable while loading.
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} sx={{ flex: "1 1 180px", minWidth: 160 }}>
            <CardContent>
              <Skeleton width="60%" />
              <Skeleton width="80%" height={36} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  const g = data.data;
  const btc = g.market_cap_percentage.btc ?? 0;
  const eth = g.market_cap_percentage.eth ?? 0;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
      <StatCard
        label="Total Market Cap"
        value={`$${formatCompact(g.total_market_cap.usd)}`}
        change={g.market_cap_change_percentage_24h_usd}
      />
      <StatCard label="24h Volume" value={`$${formatCompact(g.total_volume.usd)}`} />
      <StatCard label="BTC Dominance" value={`${btc.toFixed(1)}%`} />
      <StatCard label="ETH Dominance" value={`${eth.toFixed(1)}%`} />
    </Box>
  );
}
