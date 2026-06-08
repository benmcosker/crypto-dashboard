import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { fetchMarkets } from "../api/client";
import {
  PERIOD_CHANGE_FIELD,
  PERIOD_CHANGE_LABEL,
  type Coin,
  type Period,
} from "../api/types";
import { formatCurrency } from "../utils/format";
import PercentChange from "./PercentChange";
import WidgetCard from "./WidgetCard";

interface Props {
  period: Period;
  selectedCoin: string;
  onSelectCoin: (id: string) => void;
}

// Metric 1 (Live Price + change) plus the 7-day sparkline. Rows are clickable to
// drive the price-history chart (metric 3).
export default function LivePrices({ period, selectedCoin, onSelectCoin }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
    refetchInterval: 60_000,
  });

  const changeField = PERIOD_CHANGE_FIELD[period];

  return (
    <WidgetCard
      title="Live Prices"
      subtitle={`Top coins · ${PERIOD_CHANGE_LABEL[period]} change · click a row to chart it`}
      isLoading={isLoading}
      error={error}
    >
      <Box sx={{ maxHeight: 420, overflow: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Coin</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">{PERIOD_CHANGE_LABEL[period]} %</TableCell>
              <TableCell align="right">7d trend</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data ?? []).map((coin: Coin) => {
              const spark = coin.sparkline_in_7d?.price ?? [];
              const up = (coin[changeField] ?? 0) >= 0;
              return (
                <TableRow
                  key={coin.id}
                  hover
                  selected={coin.id === selectedCoin}
                  onClick={() => onSelectCoin(coin.id)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar src={coin.image} alt={coin.name} sx={{ width: 24, height: 24 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                          {coin.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {coin.symbol.toUpperCase()}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(coin.current_price)}</TableCell>
                  <TableCell align="right">
                    <PercentChange value={coin[changeField]} />
                  </TableCell>
                  <TableCell align="right">
                    {spark.length > 1 && (
                      <Box sx={{ width: 96, height: 36, ml: "auto" }}>
                        <SparkLineChart
                          data={spark}
                          height={36}
                          width={96}
                          colors={[up ? "#2e7d32" : "#d32f2f"]}
                          curve="natural"
                        />
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </WidgetCard>
  );
}
