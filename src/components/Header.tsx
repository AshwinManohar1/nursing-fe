import { Grid, Typography, Button, Box, Avatar, Menu, MenuItem } from "@mui/material";
import { Logout } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  return (
    <>
      <Grid
        container
        alignItems="center"
        justifyContent="space-between"
        sx={{ 
          backgroundColor: "#FFFFFF",
          color: "#1F2937", 
          px: 3, 
          py: 2,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          borderBottom: "1px solid #E5E7EB"
        }}
      >
      {/* Logo and Brand */}
      <Grid
        size="auto"
        sx={{ cursor: "pointer" }}
        onClick={() => {
          const userRole = user?.role?.toUpperCase();
          if (userRole === 'WARD_INCHARGE') {
            navigate("/roster");
          } else {
            navigate("/");
          }
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          {/* Diamond Logo */}
          <Box
            sx={{
              width: 32,
              height: 32,
              backgroundColor: "#0F766E",
              transform: "rotate(45deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&::before": {
                content: '""',
                width: 16,
                height: 16,
                backgroundColor: "#FFFFFF",
                transform: "rotate(45deg)",
                borderRadius: "2px"
              }
            }}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontFamily: "'Inter', 'Roboto', sans-serif",
              color: "#1F2937",
              letterSpacing: 0.5,
            }}
          >
            ZyNurse
          </Typography>
        </Box>
      </Grid>

      {/* Navigation */}
      <Grid size="auto">
        <Box display="flex" alignItems="center" gap={1}>
          {user?.role?.toUpperCase() !== 'WARD_INCHARGE' && (
            <Button
              onClick={() => navigate("/")}
              sx={{
                color: isActive("/") ? "#0F766E" : "#6B7280",
                fontWeight: isActive("/") ? 600 : 400,
                textTransform: "none",
                fontSize: "0.95rem",
                '&:hover': { 
                  backgroundColor: "transparent",
                  color: "#0F766E"
                }
              }}
            >
              Dashboard
            </Button>
          )}
          <Button
            onClick={() => navigate("/roster")}
            sx={{
              color: isActive("/roster") ? "#0F766E" : "#6B7280",
              fontWeight: isActive("/roster") ? 600 : 400,
              textTransform: "none",
              fontSize: "0.95rem",
              '&:hover': { 
                backgroundColor: "transparent",
                color: "#0F766E"
              }
            }}
          >
            Roster
          </Button>
          <Button
            onClick={() => navigate("/settings")}
            sx={{
              color: isActive("/settings") ? "#0F766E" : "#6B7280",
              fontWeight: isActive("/settings") ? 600 : 400,
              textTransform: "none",
              fontSize: "0.95rem",
              '&:hover': { 
                backgroundColor: "transparent",
                color: "#0F766E"
              }
            }}
          >
            Settings
          </Button>
        </Box>
      </Grid>

      {/* User Actions */}
      <Grid size="auto">
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar 
            onClick={handleMenuOpen}
            sx={{ 
              width: 32, 
              height: 32,
              cursor: "pointer",
              backgroundColor: "#14B8A6",
              '&:hover': {
                boxShadow: "0 0 0 2px #0F766E"
              }
            }}
          >
            {user?.name?.charAt(0) || 'U'}
          </Avatar>
        </Box>
      </Grid>
    </Grid>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPaper-root': {
            mt: 1,
            minWidth: 200,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: 2,
          }
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #E5E7EB' }}>
          <Typography variant="subtitle2" fontWeight="bold" color="#1F2937">
            {user?.name || 'User'}
          </Typography>
          <Typography variant="caption" color="#6B7280">
            {user?.role || 'User'}
          </Typography>
        </Box>
        <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
          <Logout sx={{ mr: 1.5, fontSize: 20, color: '#6B7280' }} />
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

export default Header;