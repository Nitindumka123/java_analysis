import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Box, Drawer, Toolbar, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import toast from 'react-hot-toast'
import Header from './Header'
import Sidebar from './Sidebar'
import { useProject } from '../../contexts/ProjectContext'

const drawerWidth = 280

export default function WorkspaceLayout() {
  const navigate = useNavigate()
  const { clearProject } = useProject()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  const handleRequestClearWorkspace = () => {
    setConfirmClearOpen(true)
  }

  const handleConfirmClearWorkspace = () => {
    setConfirmClearOpen(false)
    clearProject()
    setMobileOpen(false)
    toast.success('Workspace cleared')
    navigate('/')
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0F172A', color: '#F8FAFC' }}>
      <Header
        onToggleMobileMenu={() => setMobileOpen((prev) => !prev)}
        onRequestClearWorkspace={handleRequestClearWorkspace}
      />

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

      {/* Clear Workspace Confirmation Dialog */}
      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        aria-labelledby="clear-workspace-dialog-title"
        aria-describedby="clear-workspace-dialog-description"
        PaperProps={{
          sx: {
            bgcolor: '#1E293B',
            color: '#F8FAFC',
            border: '1px solid #334155',
            borderRadius: 3,
            minWidth: { xs: '88vw', sm: 420 },
          },
        }}
      >
        <DialogTitle
          id="clear-workspace-dialog-title"
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700, color: '#F8FAFC' }}
        >
          <WarningAmberIcon sx={{ color: '#F43F5E' }} />
          Confirm Workspace Reset
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="clear-workspace-dialog-description" sx={{ color: '#CBD5E1' }}>
            Are you sure you want to clear the current analysis?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setConfirmClearOpen(false)}
            sx={{
              borderColor: '#475569',
              color: '#CBD5E1',
              textTransform: 'none',
              '&:hover': { borderColor: '#94A3B8', bgcolor: 'rgba(148, 163, 184, 0.08)' },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmClearWorkspace}
            sx={{
              bgcolor: '#EF4444',
              color: '#F8FAFC',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#DC2626' },
            }}
          >
            Yes, Clear Workspace
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
