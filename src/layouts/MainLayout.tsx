import { Box } from '@mui/material'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import type { ReactNode } from 'react'

const NO_SIDEBAR_ROUTES = ['/login']

export default function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const showSidebar = !NO_SIDEBAR_ROUTES.includes(pathname)

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {children}
      </Box>
    </Box>
  )
}
