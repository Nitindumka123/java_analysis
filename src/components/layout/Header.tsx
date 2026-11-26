import { AppBar, Toolbar, Typography, IconButton, Box, Button } from '@mui/material'
import CodeIcon from '@mui/icons-material/Code'
import MenuIcon from '@mui/icons-material/Menu'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useProject } from '../../contexts/ProjectContext'

interface HeaderProps {
  onToggleMobileMenu: () => void
  onRequestClearWorkspace?: () => void
}

export default function Header({ onToggleMobileMenu, onRequestClearWorkspace }: HeaderProps) {
  const { activeProject } = useProject()

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        borderBottom: '1px solid #1E293B',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Open navigation menu"
            data-testid="mobile-menu-button"
            onClick={onToggleMobileMenu}
            sx={{
              mr: 1.5,
              display: 'inline-flex',
              '@media (min-width: 1024px)': { display: 'none' },
            }}
          >
            <MenuIcon />
          </IconButton>
          <CodeIcon sx={{ mr: 1.5, color: '#6366F1', flexShrink: 0 }} />
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            DevScope{' '}
            <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 400, color: '#94A3B8', display: { xs: 'none', sm: 'inline' } }}>
              Engineering Intelligence Platform
            </Box>
          </Typography>
          {activeProject && (
            <Box
              sx={{
                ml: { xs: 1.5, sm: 3 },
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                bgcolor: '#1E293B',
                px: 2,
                py: 0.5,
                borderRadius: 2,
                border: '1px solid #334155',
                minWidth: 0,
              }}
            >
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#818CF8' }}>
                Project: {activeProject.name}
              </Typography>
            </Box>
          )}
        </Box>
        {activeProject && onRequestClearWorkspace && (
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={onRequestClearWorkspace}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              flexShrink: 0,
              bgcolor: '#EF4444',
              '&:hover': { bgcolor: '#DC2626' },
            }}
          >
            Clear Workspace
          </Button>
        )}
      </Toolbar>
    </AppBar>
  )
}
