import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Optional: specify which roles can access this route
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#F9FAFB',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="#6B7280">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && user) {
    const userRole = user.role.toUpperCase();
    const hasAccess = allowedRoles.some(role => role.toUpperCase() === userRole);
    
    if (!hasAccess) {
      // Redirect ward_incharge to /roster, others to login
      if (userRole === 'WARD_INCHARGE') {
        return <Navigate to="/roster" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
