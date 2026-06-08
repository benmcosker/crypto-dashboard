import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { fetchGlobal } from "../api/client";
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["global"],
    queryFn: fetchGlobal,
  });

  if (isLoading || error || !data) {
    // Render placeholders so the row keeps its height while loading.
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">
            {error ? "Failed to load market overview" : "Loading market overview…"}
          </Typography>
        </CardContent>
      </Card>
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
      <StatCard
        label="24h Volume"
        value={`$${formatCompact(g.total_volume.usd)}`}
      />
      <StatCard label="BTC Dominance" value={`${btc.toFixed(1)}%`} />
      <StatCard label="ETH Dominance" value={`${eth.toFixed(1)}%`} />
    </Box>
  );
}
