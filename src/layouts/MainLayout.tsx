import Header from "../components/Header";
import Footer from "../components/Footer";
import { Grid } from "@mui/material";
import { useLocation } from "react-router-dom";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const standalonePaths = ['/login', '/privacy', '/terms', '/accessibility'];
  const isStandalonePage = standalonePaths.includes(location.pathname);

  // Standalone pages render without the app header/footer (they bring their own chrome)
  if (isStandalonePage) {
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