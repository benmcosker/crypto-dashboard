import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { PERIODS, type Period } from "../api/types";

interface Props {
  value: Period;
  onChange: (period: Period) => void;
}

// Time-period selector (Today / Last week / Last month / Last quarter).
export default function PeriodFilter({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      color="secondary"
      aria-label="time period"
      onChange={(_, next: Period | null) => {
        if (next) onChange(next);
      }}
      sx={{
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 2,
        "& .MuiToggleButton-root": {
          color: "rgba(255,255,255,0.85)",
          border: "none",
          px: 1.75,
        },
        "& .Mui-selected": {
          color: "secondary.contrastText",
        },
      }}
    >
      {PERIODS.map((p) => (
        <ToggleButton key={p.value} value={p.value} aria-label={p.label}>
          {p.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
