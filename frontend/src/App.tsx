import { useState } from "react";
import {
  AppBar,
  Box,
  Container,
  Toolbar,
  Typography,
} from "@mui/material";
import CurrencyBitcoinIcon from "@mui/icons-material/CurrencyBitcoin";
import type { Period } from "./api/types";
import PeriodFilter from "./components/PeriodFilter";
import MarketOverview from "./components/MarketOverview";
import LivePrices from "./components/LivePrices";
import PriceChart from "./components/PriceChart";
import Trending from "./components/Trending";
import ExchangeVolume from "./components/ExchangeVolume";

export default function App() {
  const [period, setPeriod] = useState<Period>("week");
  const [selectedCoin, setSelectedCoin] = useState<string>("bitcoin");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 6 }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1.5, flexWrap: "wrap" }}>
          <CurrencyBitcoinIcon sx={{ color: "secondary.main" }} />
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Crypto Dashboard
          </Typography>
          <PeriodFilter value={period} onChange={setPeriod} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <MarketOverview />
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
          }}
        >
          <Box sx={{ display: "grid", gap: 3 }}>
            <PriceChart coinId={selectedCoin} period={period} />
            <LivePrices
              period={period}
              selectedCoin={selectedCoin}
              onSelectCoin={setSelectedCoin}
            />
          </Box>
          <Box sx={{ display: "grid", gap: 3, alignContent: "start" }}>
            <Trending onSelectCoin={setSelectedCoin} />
            <ExchangeVolume />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
