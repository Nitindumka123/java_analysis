import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Switch,
  Slider,
  TextField,
  Button,
  Grid,
  Divider,
  CircularProgress,
} from '@mui/material'
import {
  Tune as TuneIcon,
  DarkMode as DarkModeIcon,
  Save as SaveIcon,
  RestartAlt as RestartAltIcon,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { apiService } from '../../services/api'
import { useProject } from '../../contexts/ProjectContext'

export interface AppSettingsState {
  darkMode: boolean
  notificationsEnabled: boolean
  autoRefreshData: boolean
  maxCyclomaticComplexity: number
  maxMethodLength: number
  maxClassSize: number
}

const STORAGE_KEY = 'devscope_settings'

const DEFAULT_SETTINGS: AppSettingsState = {
  darkMode: true,
  notificationsEnabled: true,
  autoRefreshData: false,
  maxCyclomaticComplexity: 10,
  maxMethodLength: 25,
  maxClassSize: 200,
}

function loadLocalSettings(): { settings: AppSettingsState; hasStored: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { settings: { ...DEFAULT_SETTINGS, ...parsed }, hasStored: true }
    }
  } catch {
    // Fallback to default settings
  }
  return { settings: DEFAULT_SETTINGS, hasStored: false }
}

function persistLocalSettings(next: AppSettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    document.documentElement.dataset.theme = next.darkMode ? 'dark' : 'light'
  } catch {
    // Ignore localStorage errors
  }
}

export default function Settings() {
  const { activeProject, setActiveProject } = useProject()
  const [settings, setSettings] = useState<AppSettingsState>(() => loadLocalSettings().settings)
  const [saving, setSaving] = useState(false)

  // Synchronize persisted localStorage settings with Express backend on mount
  useEffect(() => {
    let active = true
    const { settings: local, hasStored } = loadLocalSettings()
    document.documentElement.dataset.theme = local.darkMode ? 'dark' : 'light'

    const syncWithBackend = async () => {
      try {
        if (hasStored) {
          const res = await apiService.updateSettings(local)
          if (active && res?.settings) {
            setSettings({ ...DEFAULT_SETTINGS, ...res.settings })
          }
        } else {
          const remote = await apiService.getSettings()
          if (active && remote && typeof remote === 'object') {
            const merged = { ...DEFAULT_SETTINGS, ...remote }
            setSettings(merged)
            persistLocalSettings(merged)
          }
        }
      } catch {
        // Keep local settings if backend is temporarily unavailable
      }
    }

    syncWithBackend()
    return () => {
      active = false
    }
  }, [])

  const updateField = <K extends keyof AppSettingsState>(key: K, value: AppSettingsState[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      persistLocalSettings(next)
      return next
    })
  }

  const syncToBackendAndMaybeReanalyze = async (nextSettings: AppSettingsState, message: string) => {
    setSaving(true)
    persistLocalSettings(nextSettings)
    try {
      const res = await apiService.updateSettings(nextSettings)
      const confirmed: AppSettingsState = res?.settings
        ? { ...DEFAULT_SETTINGS, ...res.settings }
        : nextSettings
      setSettings(confirmed)
      persistLocalSettings(confirmed)

      if (activeProject?.path && !activeProject.path.startsWith('uploads')) {
        try {
          const refreshed = await apiService.analyzeProject(activeProject.path, activeProject.name)
          setActiveProject(refreshed)
          if (confirmed.notificationsEnabled) {
            toast.success(`${message} Active project re-analyzed with updated thresholds.`)
          }
          return
        } catch {
          // If original path was temporary, still show save confirmation
        }
      }

      if (confirmed.notificationsEnabled) {
        toast.success(message)
      }
    } catch {
      toast.error('Saved locally, but failed to sync settings to backend server.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    void syncToBackendAndMaybeReanalyze(settings, 'Settings and analysis thresholds saved.')
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
    void syncToBackendAndMaybeReanalyze(DEFAULT_SETTINGS, 'Settings reset to defaults.')
  }

  const switchSx = {
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: '#818CF8',
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
      backgroundColor: '#6366F1',
    },
    '& .MuiSwitch-track': {
      backgroundColor: '#475569',
    },
  }

  const sliderSx = {
    color: '#6366F1',
    '& .MuiSlider-thumb': {
      bgcolor: '#818CF8',
      border: '2px solid #F8FAFC',
    },
    '& .MuiSlider-rail': {
      bgcolor: '#334155',
    },
  }

  return (
    <Box sx={{ maxWidth: 960 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
        Settings
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Configure workspace preferences and live backend static analysis thresholds
      </Typography>

      <Grid container spacing={3}>
        {/* Appearance & Workspace Preferences */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: 3,
              bgcolor: '#1E293B',
              border: '1px solid #334155',
              color: '#F8FAFC',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <DarkModeIcon sx={{ color: '#818CF8' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                Interface &amp; Notifications
              </Typography>
            </Box>
            <Divider sx={{ borderColor: '#334155', mb: 2.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#0F172A',
                  border: '1px solid #334155',
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                    Dark Mode
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Persist the Dark Slate &amp; Indigo workspace preference locally across sessions
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.darkMode}
                      onChange={(e) => updateField('darkMode', e.target.checked)}
                      sx={switchSx}
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#0F172A',
                  border: '1px solid #334155',
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                    Enable Notifications
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Show toast notifications for completed analyses, exports, and threshold saves
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notificationsEnabled}
                      onChange={(e) => updateField('notificationsEnabled', e.target.checked)}
                      sx={switchSx}
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#0F172A',
                  border: '1px solid #334155',
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                    Auto-refresh Metrics
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Automatically re-analyze the active project on the backend when saving thresholds
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoRefreshData}
                      onChange={(e) => updateField('autoRefreshData', e.target.checked)}
                      sx={switchSx}
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Analysis Thresholds */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: 3,
              bgcolor: '#1E293B',
              border: '1px solid #334155',
              color: '#F8FAFC',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <TuneIcon sx={{ color: '#38BDF8' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                Analysis Thresholds
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
              Saved thresholds are sent directly to the local analyzer via POST /api/settings and applied on every project scan.
            </Typography>
            <Divider sx={{ borderColor: '#334155', mb: 3 }} />

            <Grid container spacing={3}>
              {/* Max Cyclomatic Complexity */}
              <Grid item xs={12}>
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#0F172A', border: '1px solid #334155' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                        Max Cyclomatic Complexity
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                        Methods meeting or exceeding this decision-path limit are flagged as HIGH_COMPLEXITY (Default: 10)
                      </Typography>
                    </Box>
                    <TextField
                      type="number"
                      size="small"
                      value={settings.maxCyclomaticComplexity}
                      onChange={(e) =>
                        updateField('maxCyclomaticComplexity', Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                      }
                      inputProps={{ min: 1, max: 50, 'aria-label': 'Max Cyclomatic Complexity' }}
                      sx={{
                        width: 110,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#1E293B',
                          color: '#F8FAFC',
                          '& fieldset': { borderColor: '#334155' },
                        },
                      }}
                    />
                  </Box>
                  <Slider
                    value={settings.maxCyclomaticComplexity}
                    min={1}
                    max={50}
                    step={1}
                    valueLabelDisplay="auto"
                    onChange={(_e, val) => updateField('maxCyclomaticComplexity', val as number)}
                    sx={sliderSx}
                  />
                </Box>
              </Grid>

              {/* Max Method Length */}
              <Grid item xs={12}>
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#0F172A', border: '1px solid #334155' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                        Max Method Length (lines)
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                        Methods longer than this line limit trigger a LONG_METHOD smell (Default: 25 lines)
                      </Typography>
                    </Box>
                    <TextField
                      type="number"
                      size="small"
                      value={settings.maxMethodLength}
                      onChange={(e) =>
                        updateField('maxMethodLength', Math.max(10, Math.min(250, Number(e.target.value) || 10)))
                      }
                      inputProps={{ min: 10, max: 250, 'aria-label': 'Max Method Length' }}
                      sx={{
                        width: 110,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#1E293B',
                          color: '#F8FAFC',
                          '& fieldset': { borderColor: '#334155' },
                        },
                      }}
                    />
                  </Box>
                  <Slider
                    value={settings.maxMethodLength}
                    min={10}
                    max={250}
                    step={5}
                    valueLabelDisplay="auto"
                    onChange={(_e, val) => updateField('maxMethodLength', val as number)}
                    sx={sliderSx}
                  />
                </Box>
              </Grid>

              {/* Max Class Size */}
              <Grid item xs={12}>
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#0F172A', border: '1px solid #334155' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                        Max Class Size (lines)
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                        Classes exceeding this threshold are flagged as GOD_CLASS candidates (Default: 200 lines)
                      </Typography>
                    </Box>
                    <TextField
                      type="number"
                      size="small"
                      value={settings.maxClassSize}
                      onChange={(e) =>
                        updateField('maxClassSize', Math.max(50, Math.min(2000, Number(e.target.value) || 50)))
                      }
                      inputProps={{ min: 50, max: 2000, 'aria-label': 'Max Class Size' }}
                      sx={{
                        width: 110,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#1E293B',
                          color: '#F8FAFC',
                          '& fieldset': { borderColor: '#334155' },
                        },
                      }}
                    />
                  </Box>
                  <Slider
                    value={settings.maxClassSize}
                    min={50}
                    max={2000}
                    step={50}
                    valueLabelDisplay="auto"
                    onChange={(_e, val) => updateField('maxClassSize', val as number)}
                    sx={sliderSx}
                  />
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                disabled={saving}
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                sx={{
                  borderColor: '#475569',
                  color: '#CBD5E1',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#94A3B8', bgcolor: 'rgba(148, 163, 184, 0.08)' },
                }}
              >
                Reset Defaults
              </Button>
              <Button
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                sx={{
                  bgcolor: '#4F46E5',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#4338CA' },
                }}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
