import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Drawer, Toolbar } from '@mui/material'
import Header from './Header'
import Sidebar from './Sidebar'

const drawerWidth = 260

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0F172A', color: '#F8FAFC' }}>
      <Header onToggleMobileMenu={() => setMobileOpen((prev) => !prev)} />

      {/* Collapsible Mobile/Tablet Drawer (< 1024px) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: false }}
        sx={{
          display: 'block',
          '@media (min-width: 1024px)': { display: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            borderRight: '1px solid #1E293B',
          },
        }}
      >
        <Toolbar />
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      {/* Desktop Permanent Drawer (>= 1024px) */}
      <Drawer
        variant="permanent"
        data-testid="desktop-sidebar"
        sx={{
          display: 'none',
          '@media (min-width: 1024px)': { display: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            borderRight: '1px solid #1E293B',
          },
        }}
      >
        <Toolbar />
        <Sidebar />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          mt: 8,
          bgcolor: '#0F172A',
          minHeight: '100vh',
          width: '100%',
          '@media (min-width: 1024px)': {
            width: `calc(100% - ${drawerWidth}px)`,
          },
          overflowX: 'hidden',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
