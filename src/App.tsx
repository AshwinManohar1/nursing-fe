import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './theme/theme'
import { AuthProvider } from './contexts/AuthContext'
import AppRouter from './routes/AppRouter'

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
