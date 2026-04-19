import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  Divider,
  Avatar,
  IconButton,
} from '@mui/material'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardOutlinedIcon />, path: '/' },
  { label: 'Roster', icon: <CalendarMonthOutlinedIcon />, path: '/roster' },
  { label: 'Transfers', icon: <SwapHorizOutlinedIcon />, path: '/transfers' },
  { label: 'Staff', icon: <PeopleAltOutlinedIcon />, path: '/staff' },
  { label: 'Insights', icon: <InsightsOutlinedIcon />, path: '/insights' },
]

const SIDEBAR_WIDTH = 220

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        minHeight: '100vh',
        bgcolor: 'secondary.main',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 2.5, pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '6px',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 16, color: '#fff' }} />
          </Box>
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, letterSpacing: '-0.3px' }}>
            ShiftWise
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Clinical Curator
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2, my: 1.5 }} />

      {/* Nav */}
      <List disablePadding sx={{ px: 1.5, flex: 1 }}>
        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = pathname === path || (path !== '/' && pathname.startsWith(path))
          return (
            <Tooltip key={path} title="" placement="right">
              <ListItemButton
                onClick={() => navigate(path)}
                sx={{
                  borderRadius: '8px',
                  mb: 0.5,
                  px: 1.5,
                  py: 0.9,
                  color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                  bgcolor: active ? 'rgba(11,171,135,0.18)' : 'transparent',
                  '&:hover': {
                    bgcolor: active ? 'rgba(11,171,135,0.22)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>{icon}</ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400 }}
                />
              </ListItemButton>
            </Tooltip>
          )
        })}
      </List>

      {/* Bottom actions */}
      <Box sx={{ px: 1.5, pb: 2 }}>
        <Box
          sx={{
            bgcolor: 'primary.main',
            borderRadius: '10px',
            px: 2,
            py: 1.5,
            mb: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <AutoAwesomeOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.82rem' }}>AI Copilot</Typography>
        </Box>

        <ListItemButton
          onClick={() => navigate('/settings')}
          sx={{ borderRadius: '8px', px: 1.5, py: 0.9, color: 'rgba(255,255,255,0.45)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}><SettingsOutlinedIcon /></ListItemIcon>
          <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.85rem' }} />
        </ListItemButton>

        <ListItemButton
          sx={{ borderRadius: '8px', px: 1.5, py: 0.9, color: 'rgba(255,255,255,0.45)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}><HelpOutlineOutlinedIcon /></ListItemIcon>
          <ListItemText primary="Support" primaryTypographyProps={{ fontSize: '0.85rem' }} />
        </ListItemButton>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1.5 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 0.5 }}>
          <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.dark', fontSize: '0.75rem' }}>
            {user?.name?.charAt(0) ?? 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 500 }}>
              {user?.name ?? 'User'}
            </Typography>
            <Typography noWrap sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
              {user?.role ?? ''}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
        </Box>
      </Box>
    </Box>
  )
}
