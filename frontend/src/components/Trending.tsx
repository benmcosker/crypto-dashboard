import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Box,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from "@mui/material";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { fetchTrending } from "../api/client";
import PercentChange from "./PercentChange";
import WidgetCard from "./WidgetCard";

interface Props {
  onSelectCoin: (id: string) => void;
}

// Metric 4: trending coins. /search/trending is a live snapshot, independent of
// the period filter.
export default function Trending({ onSelectCoin }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrending,
  });

  return (
    <WidgetCard
      title="Trending"
      subtitle="Most searched right now"
      isLoading={isLoading}
      error={error}
      action={<WhatshotIcon color="secondary" />}
    >
      <List dense disablePadding>
        {(data?.coins ?? []).slice(0, 7).map(({ item }, idx) => (
          <ListItem
            key={item.id}
            disableGutters
            onClick={() => onSelectCoin(item.id)}
            sx={{ cursor: "pointer", borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
            secondaryAction={
              <PercentChange value={item.data?.price_change_percentage_24h?.usd} />
            }
          >
            <Box sx={{ width: 22, textAlign: "center", color: "text.secondary", fontWeight: 700 }}>
              {idx + 1}
            </Box>
            <ListItemAvatar sx={{ minWidth: 44 }}>
              <Avatar src={item.thumb} alt={item.name} sx={{ width: 28, height: 28 }} />
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                  {item.name}{" "}
                  <Chip
                    component="span"
                    label={item.symbol.toUpperCase()}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, fontSize: 10 }}
                  />
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </WidgetCard>
  );
}
