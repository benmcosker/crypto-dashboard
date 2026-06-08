import { createTheme } from "@mui/material/styles";

// Dashboard palette: blue primary, yellow accent, white surfaces.
// Greens/reds are reserved for price gains and losses.
const BLUE = "#1565c0";
const BLUE_DARK = "#0d47a1";
const YELLOW = "#ffc400";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: BLUE,
      dark: BLUE_DARK,
      light: "#5e92f3",
      contrastText: "#ffffff",
    },
    secondary: {
      main: YELLOW,
      dark: "#c79400",
      light: "#fff64f",
      contrastText: "#1a1a1a",
    },
    success: { main: "#2e7d32" },
    error: { main: "#d32f2f" },
    background: {
      default: "#f4f7fc",
      paper: "#ffffff",
    },
    text: {
      primary: "#1a2027",
      secondary: "#5a6b7b",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid #e3e8ef",
          height: "100%",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: BLUE_DARK,
          backgroundImage: `linear-gradient(90deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`,
        },
      },
    },
  },
});

export default theme;
