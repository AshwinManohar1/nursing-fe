import { createTheme, type ThemeOptions } from "@mui/material/styles";

const themeOptions: ThemeOptions = {
  palette: {
    mode: "light",
    primary: {
      main: "#8B5CF6", // vibrant purple
      light: "#A78BFA",
      dark: "#7C3AED",
    },
    secondary: {
      main: "#14B8A6", // bright teal
      light: "#5EEAD4",
      dark: "#0F766E",
    },
    background: {
      default: "#F8FAFC",
      paper: "#FFFFFF",
    },
    success: {
      main: "#10B981",
    },
    warning: {
      main: "#F59E0B",
    },
    error: {
      main: "#EF4444",
    },
    info: {
      main: "#3B82F6",
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
    h4: {
      fontWeight: 600,
    },
    body1: {
      fontSize: "0.95rem",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@keyframes pulse': {
          '0%': {
            opacity: 1,
          },
          '50%': {
            opacity: 0.5,
          },
          '100%': {
            opacity: 1,
          },
        },
      },
    },
  },
};

const theme = createTheme(themeOptions);
export default theme;