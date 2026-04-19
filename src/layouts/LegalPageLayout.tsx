import { Box, Typography, IconButton, Stack, Link, Container } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import shiftwiseLogo from '../assets/shiftwise_logo.png';

type Props = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

const LegalPageLayout = ({ title, lastUpdated, children }: Props) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F9FAFB',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          py: 2,
          px: { xs: 2, md: 4 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          aria-label="Go back"
          sx={{ color: '#6B7280' }}
        >
          <ArrowBack />
        </IconButton>
        <Box
          component={RouterLink}
          to="/login"
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <Box
            component="img"
            src={shiftwiseLogo}
            alt="ShiftWise"
            sx={{ height: 48, width: 'auto' }}
          />
        </Box>
      </Box>

      {/* Content */}
      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 4, md: 6 } }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.02em',
            fontSize: { xs: '1.75rem', md: '2.25rem' },
            mb: 1,
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ color: '#6B7280', mb: 4, fontSize: '0.875rem' }}>
          Last updated: {lastUpdated}
        </Typography>
        <Box
          sx={{
            '& h2': {
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#111827',
              mt: 4,
              mb: 1.5,
            },
            '& p': {
              color: '#374151',
              lineHeight: 1.75,
              fontSize: '1rem',
              mb: 2,
            },
            '& ul': {
              color: '#374151',
              lineHeight: 1.75,
              fontSize: '1rem',
              pl: 3,
              mb: 2,
            },
            '& li': { mb: 0.5 },
            '& a': { color: '#0F766E', fontWeight: 500 },
          }}
        >
          {children}
        </Box>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          borderTop: '1px solid #E5E7EB',
          py: 3,
          px: 2,
          backgroundColor: '#FFFFFF',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1, sm: 3 }}
          justifyContent="center"
          alignItems="center"
        >
          <Typography sx={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
            © {new Date().getFullYear()} ShiftWise. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Link component={RouterLink} to="/privacy" underline="hover" sx={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
              Privacy Policy
            </Link>
            <Link component={RouterLink} to="/terms" underline="hover" sx={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
              Terms of Service
            </Link>
            <Link component={RouterLink} to="/accessibility" underline="hover" sx={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
              Accessibility
            </Link>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

export default LegalPageLayout;
