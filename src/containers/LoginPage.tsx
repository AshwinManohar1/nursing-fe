import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Badge,
  Lock,
  Visibility,
  VisibilityOff,
  LocalHospital
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [employee_id, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!employee_id || !password) {
      setError('Please enter both employee ID and password');
      return;
    }

    const success = await login(employee_id, password);
    if (success) {
      navigate('/');
    } else {
      setError('Invalid employee ID or password');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        p: 2
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: 3
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={3}>
              <LocalHospital
                sx={{
                  fontSize: 48,
                  color: '#14B8A6',
                  mb: 2
                }}
              />
              <Typography variant="h4" fontWeight="bold" color="#1F2937" gutterBottom>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="#6B7280">
                Sign in to your ZyNurse account
              </Typography>
            </Box>

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Employee ID"
                type="text"
                value={employee_id}
                onChange={(e) => setEmployeeId(e.target.value)}
                margin="normal"
                required
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Badge sx={{ color: '#9CA3AF' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: '#D1D5DB',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9CA3AF',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#14B8A6',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#9CA3AF' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={togglePasswordVisibility}
                        edge="end"
                        sx={{ color: '#9CA3AF' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: '#D1D5DB',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9CA3AF',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#14B8A6',
                    },
                  },
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{
                  backgroundColor: '#14B8A6',
                  '&:hover': { backgroundColor: '#0F766E' },
                  textTransform: 'none',
                  py: 1.5,
                  mt: 3,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage;
