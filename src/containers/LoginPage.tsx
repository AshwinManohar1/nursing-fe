import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  SupportAgent,
  AutoAwesome,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import shiftwiseLogo from '../assets/shiftwise_logo.png';
import apolloLogo from '../assets/apollo_hospitals_logo.png';
import loginHero from '../assets/login_hero.png';

const LoginPage: React.FC = () => {
  const [employee_id, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
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
      navigate('/roster');
    } else {
      setError('Invalid employee ID or password');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const fillJudgeCredentials = () => {
    setEmployeeId('AP001');
    setPassword('admin@123');
    setError('');
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      backgroundColor: '#F9FAFB',
      '& fieldset': { borderColor: '#E5E7EB' },
      '&:hover fieldset': { borderColor: '#D1D5DB' },
      '&.Mui-focused fieldset': { borderColor: '#14B8A6' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#0F766E' },
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* Left: Marketing panel */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          minHeight: 0,
          px: { md: 5, lg: 7 },
          pt: { md: 4, lg: 5 },
          pb: 0,
          background:
            'linear-gradient(180deg, #F0FDF9 0%, #F9FAFB 55%, #FFFFFF 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Brand */}
        <Box display="flex" alignItems="center" gap={2.5} mb={2.5}>
          <Box
            component="img"
            src={shiftwiseLogo}
            alt="ShiftWise"
            sx={{ height: 80, width: 'auto', display: 'block' }}
          />
          <Box
            sx={{
              width: '1px',
              height: 52,
              backgroundColor: '#E5E7EB',
            }}
          />
          <Box
            component="img"
            src={apolloLogo}
            alt="Apollo Hospitals"
            sx={{ height: 72, width: 'auto', display: 'block' }}
          />
        </Box>

        {/* Headline */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: { md: '1.75rem', lg: '2.25rem' },
              lineHeight: 1.15,
              color: '#111827',
              letterSpacing: '-0.02em',
            }}
          >
            Human-centric scheduling,{' '}
            <Box component="span" sx={{ color: '#14B8A6' }}>
              powered by AI.
            </Box>
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              color: '#6B7280',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              maxWidth: 540,
            }}
          >
            Transforming high-density clinical logistics into a curated
            experience of empathy and operational intelligence.
          </Typography>
        </Box>

        {/* Hero image */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            mt: 'auto',
            alignSelf: 'stretch',
            display: 'flex',
            justifyContent: 'flex-start',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={loginHero}
            alt="Clinical team using ShiftWise AI staffing intelligence"
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              height: 'auto',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Box>
      </Box>

      {/* Right: Form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 3, sm: 6 },
          py: { xs: 3, md: 4 },
          overflowY: 'auto',
        }}
      >
        {/* Mobile brand (shown only on small screens) */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            mb: 3,
          }}
        >
          <Box
            component="img"
            src={shiftwiseLogo}
            alt="ShiftWise"
            sx={{ height: 64, width: 'auto' }}
          />
          <Box sx={{ width: '1px', height: 40, backgroundColor: '#E5E7EB' }} />
          <Box
            component="img"
            src={apolloLogo}
            alt="Apollo Hospitals"
            sx={{ height: 60, width: 'auto' }}
          />
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.01em',
              mb: 0.5,
            }}
          >
            Welcome back
          </Typography>
          <Typography sx={{ color: '#6B7280', mb: 3 }}>
            Access your clinical dashboard
          </Typography>

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Employee ID"
              type="text"
              value={employee_id}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              autoComplete="username"
              placeholder="SW-XXXXX"
              sx={{ mb: 2.5, ...inputSx }}
            />

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 0.5 }}
            >
              <Typography
                component="label"
                htmlFor="password"
                sx={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}
              >
                {/* spacer — MUI label handles its own */}
              </Typography>
              <Link
                component="button"
                type="button"
                underline="hover"
                sx={{
                  fontSize: '0.8rem',
                  color: '#0F766E',
                  fontWeight: 500,
                }}
                onClick={(e) => e.preventDefault()}
              >
                Forgot?
              </Link>
            </Stack>

            <TextField
              id="password"
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={togglePasswordVisibility}
                      edge="end"
                      sx={{ color: '#9CA3AF' }}
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={inputSx}
            />

            <FormControlLabel
              sx={{ mt: 1.5, ml: -0.5 }}
              control={
                <Checkbox
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  size="small"
                  sx={{
                    color: '#D1D5DB',
                    '&.Mui-checked': { color: '#14B8A6' },
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: '0.875rem', color: '#4B5563' }}>
                  Remember this device
                </Typography>
              }
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
                py: 1.25,
                mt: 2.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px -2px rgba(20, 184, 166, 0.35)',
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Hackathon helper */}
          <Box
            sx={{
              mt: 2.5,
              p: 1.75,
              borderRadius: 2,
              backgroundColor: '#FFFBEB',
              border: '1px dashed #FCD34D',
            }}
          >
            <Button
              fullWidth
              variant="outlined"
              onClick={fillJudgeCredentials}
              startIcon={<AutoAwesome sx={{ fontSize: 18 }} />}
              sx={{
                textTransform: 'none',
                borderColor: '#F59E0B',
                color: '#92400E',
                backgroundColor: '#FFFFFF',
                fontWeight: 600,
                borderRadius: 1.5,
                py: 0.85,
                '&:hover': {
                  borderColor: '#D97706',
                  backgroundColor: '#FEF3C7',
                },
              }}
            >
              Fill login credentials
            </Button>
            <Typography
              sx={{
                mt: 1,
                color: '#92400E',
                fontSize: '0.75rem',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              Added for judges to log in easily (for hackathon purpose).
            </Typography>
          </Box>

          {/* Support */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography sx={{ color: '#6B7280', fontSize: '0.875rem', mb: 0.75 }}>
              Need assistance with your account?
            </Typography>
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={(e) => e.preventDefault()}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                color: '#0F766E',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <SupportAgent sx={{ fontSize: 18 }} />
              Contact Clinical IT Support
            </Link>
          </Box>

          {/* Footer */}
          <Stack
            direction="row"
            spacing={3}
            justifyContent="center"
            sx={{ mt: 3 }}
          >
            {[
              { label: 'Privacy Policy', to: '/privacy' },
              { label: 'Terms of Service', to: '/terms' },
              { label: 'Accessibility', to: '/accessibility' },
            ].map(({ label, to }) => (
              <Link
                key={to}
                component={RouterLink}
                to={to}
                underline="hover"
                sx={{ color: '#9CA3AF', fontSize: '0.75rem' }}
              >
                {label}
              </Link>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
