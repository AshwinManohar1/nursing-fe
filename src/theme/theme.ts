import { createTheme, type ThemeOptions } from '@mui/material/styles'

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#0BAB87',
      light: '#3DC4A8',
      dark: '#088A6D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1A2035',
      light: '#2D3554',
      dark: '#111827',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F4F6F9',
      paper: '#FFFFFF',
    },
    success: {
      main: '#10B981',
    },
    warning: {
      main: '#F59E0B',
    },
    error: {
      main: '#EF4444',
    },
    info: {
      main: '#3B82F6',
    },
    text: {
      primary: '#1A2035',
      secondary: '#64748B',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
  },
}

const theme = createTheme(themeOptions)
export default theme
