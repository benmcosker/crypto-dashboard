import { useQuery } from "@tanstack/react-query";
import { Box } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { fetchChart } from "../api/client";
import { PERIODS, type Period } from "../api/types";
import { formatCurrency } from "../utils/format";
import WidgetCard from "./WidgetCard";

interface Props {
  coinId: string;
  period: Period;
}

// Metric 3: price-history chart for the selected coin. The period filter maps to
// the day range (Today=1, week=7, month=30, quarter=90).
export default function PriceChart({ coinId, period }: Props) {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["chart", coinId, period],
    queryFn: () => fetchChart(coinId, period),
  });

  const points = data?.prices ?? [];
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "";

  return (
    <WidgetCard
      title="Price History"
      subtitle={`${coinId.toUpperCase()} · ${periodLabel}`}
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      isRefetching={isRefetching}
    >
      {points.length > 1 ? (
        <Box sx={{ width: "100%" }}>
          <LineChart
            height={300}
            skipAnimation
            dataset={points.map(([t, v]) => ({ t: new Date(t), v }))}
            xAxis={[
              {
                dataKey: "t",
                scaleType: "time",
                valueFormatter: (d: Date) =>
                  period === "today"
                    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : d.toLocaleDateString([], { month: "short", day: "numeric" }),
              },
            ]}
            yAxis={[{ valueFormatter: (v: number) => formatCurrency(v) }]}
            series={[
              {
                dataKey: "v",
                area: true,
                showMark: false,
                color: "#1565c0",
                valueFormatter: (v: number | null) => (v == null ? "" : formatCurrency(v)),
              },
            ]}
            margin={{ left: 70, right: 16, top: 16, bottom: 24 }}
            grid={{ horizontal: true }}
          />
        </Box>
      ) : (
        <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
          No price data available.
        </Box>
      )}
    </WidgetCard>
  );
}
