import Header from "../components/Header";
import Footer from "../components/Footer";
import { Grid } from "@mui/material";
import { useLocation } from "react-router-dom";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // For login page, render children without header/footer
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <Grid container direction="column" sx={{ minHeight: "100vh" }}>
      {/* Header */}
      <Grid size={12}>
        <Header />
      </Grid>

      {/* Main Content */}
      <Grid size={12} sx={{ flex: 1, p: 2 }}>
        {children}
      </Grid>

      {/* Footer */}
      <Grid size={12}>
        <Footer />
      </Grid>
    </Grid>
  );
};

export default MainLayout;