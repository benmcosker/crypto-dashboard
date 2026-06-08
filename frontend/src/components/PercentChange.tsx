import { Box } from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { formatPercent } from "../utils/format";

interface Props {
  value: number | undefined;
}

// Coloured up/down percentage used in tables and cards.
export default function PercentChange({ value }: Props) {
  if (value == null || Number.isNaN(value)) {
    return <Box component="span">—</Box>;
  }
  const positive = value >= 0;
  const color = positive ? "success.main" : "error.main";
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", color, fontWeight: 600 }}
    >
      {positive ? (
        <ArrowDropUpIcon fontSize="small" />
      ) : (
        <ArrowDropDownIcon fontSize="small" />
      )}
      {formatPercent(value)}
    </Box>
  );
}
