import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Box,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { fetchExchanges } from "../api/client";
import { formatCompact } from "../utils/format";
import WidgetCard from "./WidgetCard";

// Metric 5: exchange volume (24h BTC) — shows where liquidity is concentrated.
// /exchanges is a live snapshot, independent of the period filter.
export default function ExchangeVolume() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["exchanges"],
    queryFn: fetchExchanges,
  });

  const exchanges = (data ?? []).slice(0, 8);
  const max = exchanges.reduce((m, e) => Math.max(m, e.trade_volume_24h_btc), 0) || 1;

  return (
    <WidgetCard
      title="Exchange Volume"
      subtitle="24h trade volume (BTC)"
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      isRefetching={isRefetching}
    >
      <Stack spacing={1.5}>
        {exchanges.map((ex) => (
          <Box key={ex.id}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Avatar src={ex.image} alt={ex.name} sx={{ width: 22, height: 22 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                {ex.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ₿{formatCompact(ex.trade_volume_24h_btc)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(ex.trade_volume_24h_btc / max) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        ))}
      </Stack>
    </WidgetCard>
  );
}
