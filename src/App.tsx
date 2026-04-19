import { ThemeProvider, CssBaseline } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import theme from "./theme/theme";
import MainLayout from "./layouts/MainLayout";
import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./contexts/AuthContext";


const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <MainLayout>
            <AppRouter />
          </MainLayout>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;