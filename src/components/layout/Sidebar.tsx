import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import HubIcon from '@mui/icons-material/Hub'
import BugReportIcon from '@mui/icons-material/BugReport'
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate'
import SpeedIcon from '@mui/icons-material/Speed'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CodeOffIcon from '@mui/icons-material/CodeOff'
import BuildIcon from '@mui/icons-material/Build'
import TimelineIcon from '@mui/icons-material/Timeline'
import SettingsIcon from '@mui/icons-material/Settings'
import DescriptionIcon from '@mui/icons-material/Description'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { useProject } from '../../contexts/ProjectContext'

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { analysisStatus } = useProject()

  const isActive = analysisStatus === 'ACTIVE'

  const publicItems = [
    { text: 'Analyze Project', path: '/', icon: <CloudUploadIcon /> },
    { text: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  ]

  const sections = [
    {
      title: 'Workspace',
      items: [
        { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
        { text: 'Analytics', path: '/analytics', icon: <AnalyticsIcon /> },
        { text: 'Project Explorer', path: '/explorer', icon: <FolderOpenIcon /> },
        { text: 'Reports', path: '/reports', icon: <DescriptionIcon /> },
      ],
    },
    {
      title: 'Quality',
      items: [
        { text: 'Code Quality', path: '/quality', icon: <BuildIcon /> },
        { text: 'Technical Debt', path: '/debt', icon: <AssignmentLateIcon /> },
        { text: 'Complexity', path: '/complexity', icon: <SpeedIcon /> },
        { text: 'Code Smells', path: '/smells', icon: <BugReportIcon /> },
        { text: 'Duplicate Code', path: '/duplicates', icon: <ContentCopyIcon /> },
        { text: 'Dead Code', path: '/dead-code', icon: <CodeOffIcon /> },
      ],
    },
    {
      title: 'Architecture',
      items: [
        { text: 'Dependencies', path: '/dependencies', icon: <HubIcon /> },
        { text: 'Change Impact', path: '/impact', icon: <TimelineIcon /> },
      ],
    },
    {
      title: 'System',
      items: [
        { text: 'Settings', path: '/settings', icon: <SettingsIcon /> },
      ],
    },
  ]

  if (!isActive) {
    return (
      <Box className="dark-scroll-container" sx={{ overflowY: 'auto', p: 2, height: '100%' }}>
        <Typography variant="caption" sx={{ px: 2, fontWeight: 600, color: '#64748B', letterSpacing: '0.05em' }}>
          WORKSPACE
        </Typography>
        <List sx={{ mt: 1 }}>
          {publicItems.map((item) => {
            const selected = location.pathname === item.path
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={selected}
                  onClick={() => {
                    navigate(item.path)
                    onNavigate?.()
                  }}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: '#818CF8',
                      '& .MuiListItemIcon-root': { color: '#818CF8' },
                    },
                    '&:hover': { backgroundColor: 'rgba(30, 41, 59, 0.8)' },
                  }}
                >
                  <ListItemIcon sx={{ color: selected ? '#818CF8' : '#94A3B8', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: selected ? 600 : 500 }} />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>
    )
  }

  return (
    <Box className="dark-scroll-container" sx={{ overflowY: 'auto', p: 2, height: '100%' }}>
      {sections.map((section, idx) => (
        <Box key={section.title} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ px: 2, fontWeight: 600, color: '#64748B', letterSpacing: '0.05em' }}>
            {section.title.toUpperCase()}
          </Typography>
          <List sx={{ mt: 0.5 }}>
            {section.items.map((item) => {
              const selected = location.pathname === item.path
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={selected}
                    onClick={() => {
                      navigate(item.path)
                      onNavigate?.()
                    }}
                    sx={{
                      borderRadius: 2,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: '#818CF8',
                        '& .MuiListItemIcon-root': { color: '#818CF8' },
                      },
                      '&:hover': { backgroundColor: 'rgba(30, 41, 59, 0.8)' },
                    }}
                  >
                    <ListItemIcon sx={{ color: selected ? '#818CF8' : '#94A3B8', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: selected ? 600 : 500 }} />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
          {idx < sections.length - 1 && <Divider sx={{ my: 1, borderColor: '#1E293B' }} />}
        </Box>
      ))}
    </Box>
  )
}
