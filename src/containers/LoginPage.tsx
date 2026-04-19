import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Link,
  TextField,
  Typography,
  Alert,
} from '@mui/material'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const ok = await login(employeeId, password)
    setLoading(false)
    if (ok) {
      navigate('/')
    } else {
      setError('Invalid credentials. Please try again.')
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left panel */}
      <Box
        sx={{
          flex: 1,
          bgcolor: '#EDF7F5',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'secondary.main' }}>ShiftWise</Typography>
        </Box>

        <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, color: 'secondary.main', mb: 1 }}>
          Human-centric<br />scheduling,
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, color: 'primary.main', mb: 3 }}>
          powered by AI.
        </Typography>
        <Typography sx={{ color: 'text.secondary', maxWidth: 380, lineHeight: 1.7 }}>
          Transforming high-density clinical logistics into a curated experience of empathy and operational intelligence.
        </Typography>
      </Box>

      {/* Right panel */}
      <Box
        sx={{
          width: { xs: '100%', md: 460 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          px: { xs: 3, md: 6 },
          bgcolor: '#fff',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Welcome back</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 4, fontSize: '0.875rem' }}>
          Access your clinical dashboard
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Employee ID"
            placeholder="SW-000000"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BadgeOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Link href="#" underline="hover" sx={{ fontSize: '0.8rem', color: 'primary.main' }}>
                    Forgot?
                  </Link>
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            control={<Checkbox size="small" checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.85rem' }}>Remember this station</Typography>}
            sx={{ mt: -1 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || !employeeId || !password}
            sx={{ py: 1.25, fontSize: '0.9rem' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', mb: 0.5 }}>
            Need assistance with your account?
          </Typography>
          <Link href="#" underline="hover" sx={{ fontSize: '0.8rem', color: 'primary.main', fontWeight: 500 }}>
            Contact Clinical IT Support
          </Link>
        </Box>

        <Box sx={{ mt: 'auto', pt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
          {['Privacy Policy', 'Terms of Service', 'Accessibility'].map((t) => (
            <Link key={t} href="#" underline="hover" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {t}
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
