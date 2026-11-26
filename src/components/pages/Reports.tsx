import { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  CircularProgress,
  Stack,
} from '@mui/material'
import {
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { useProject } from '../../contexts/ProjectContext'
import { apiService } from '../../services/api'

function sanitizeFilenameBase(projectName: string): string {
  const sanitized = (projectName || 'Project')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._]+|[._]+$/g, '')
  return sanitized.length > 0 ? sanitized.slice(0, 64) : 'Project'
}

export default function Reports() {
  const { activeProject, analysisData } = useProject()
  const [selectedReportType, setSelectedReportType] = useState<string>('COMPLETE_ASSESSMENT')
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'csv' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  if (!activeProject || !analysisData) {
    return null
  }

  const totalDebt = analysisData.technicalDebt.overallTechnicalDebtScore
  const debtLevel = analysisData.technicalDebt.overallDebtLevel
  const debtCategories = analysisData.technicalDebt.debtCategories
  const avgComplexity = analysisData.complexity.projectSummary.averageCyclomaticComplexity
  const maintainabilityScore = analysisData.maintainability.projectMaintainability.overallMaintainabilityScore
  const totalCodeSmells = analysisData.codeSmells.statistics.totalSmells

  const reportTypes = [
    { id: 'EXECUTIVE_SUMMARY', name: 'Executive Summary', description: 'High-level summary for stakeholders', icon: <DescriptionIcon /> },
    { id: 'SOFTWARE_QUALITY', name: 'Software Quality', description: 'Comprehensive quality analysis', icon: <AssessmentIcon /> },
    { id: 'MAINTAINABILITY', name: 'Maintainability', description: 'Code maintainability metrics', icon: <SpeedIcon /> },
    { id: 'COMPLEXITY', name: 'Cyclomatic Complexity', description: 'Complexity analysis', icon: <VisibilityIcon /> },
    { id: 'TECHNICAL_DEBT', name: 'Technical Debt', description: 'Technical debt assessment', icon: <WarningIcon /> },
    { id: 'CODE_SMELLS', name: 'Code Smells', description: 'Code smell detection', icon: <WarningIcon /> },
    { id: 'COMPLETE_ASSESSMENT', name: 'Complete Assessment', description: 'Full project assessment', icon: <AssignmentIcon /> },
  ]

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleExport = async (format: 'pdf' | 'csv') => {
    setExportError(null)
    setExportingFormat(format)

    try {
      const blob =
        format === 'pdf'
          ? await apiService.downloadPdfReport(activeProject, selectedReportType)
          : await apiService.downloadCsvReport(activeProject, selectedReportType)

      const safeName = sanitizeFilenameBase(activeProject.projectName || activeProject.name)
      const filename = `DevScope_Report_${safeName}.${format}`

      triggerBlobDownload(blob, filename)
      toast.success('Report downloaded successfully')
    } catch (err: unknown) {
      let message = `Failed to generate ${format.toUpperCase()} report.`
      const axiosErr = err as { response?: { data?: unknown }; message?: string }
      if (axiosErr.response?.data instanceof Blob) {
        try {
          const text = await axiosErr.response.data.text()
          const parsed = JSON.parse(text) as { message?: string }
          if (parsed.message) {
            message = parsed.message
          }
        } catch {
          // Keep default error message if blob is not JSON
        }
      } else if (axiosErr.message) {
        message = axiosErr.message
      }
      setExportError(message)
      toast.error(message)
    } finally {
      setExportingFormat(null)
    }
  }

  const getDebtLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'LOW':
        return '#10B981'
      case 'MEDIUM':
        return '#F59E0B'
      case 'HIGH':
      case 'CRITICAL':
        return '#EF4444'
      default:
        return '#94A3B8'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10B981'
    if (score >= 70) return '#38BDF8'
    if (score >= 50) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Reports
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Generate and download physical PDF and CSV engineering reports for {activeProject?.name || 'Active Project'}
      </Typography>

      {exportError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: 3,
              bgcolor: '#1E293B',
              border: '1px solid #334155',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <AssignmentIcon sx={{ color: '#60A5FA', fontSize: 30 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC', fontSize: '1.1rem' }}>
                Export Physical Report
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
              Reports are rendered on the backend from parsed AST metrics ({activeProject.metrics.files} files,{' '}
              {activeProject.metrics.classes} classes, {activeProject.metrics.methods} methods) and streamed as binary downloads.
            </Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel sx={{ color: '#94A3B8' }}>Report Type</InputLabel>
              <Select
                value={selectedReportType}
                label="Report Type"
                disabled={exportingFormat !== null}
                onChange={(e) => setSelectedReportType(e.target.value)}
                sx={{ borderRadius: 2, bgcolor: '#0F172A', color: '#F8FAFC' }}
              >
                {reportTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {type.icon}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {type.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {type.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                fullWidth
                disabled={exportingFormat !== null}
                startIcon={exportingFormat === 'pdf' ? <CircularProgress size={18} color="inherit" /> : <PdfIcon />}
                onClick={() => handleExport('pdf')}
                sx={{
                  height: 48,
                  bgcolor: '#4F46E5',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#4338CA' },
                }}
              >
                {exportingFormat === 'pdf' ? 'Generating PDF...' : 'Export PDF'}
              </Button>

              <Button
                variant="outlined"
                fullWidth
                disabled={exportingFormat !== null}
                startIcon={exportingFormat === 'csv' ? <CircularProgress size={18} color="inherit" /> : <CsvIcon />}
                onClick={() => handleExport('csv')}
                sx={{
                  height: 48,
                  borderColor: '#38BDF8',
                  color: '#38BDF8',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': { borderColor: '#7DD3FC', bgcolor: 'rgba(56, 189, 248, 0.08)' },
                }}
              >
                {exportingFormat === 'csv' ? 'Generating CSV...' : 'Export CSV'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: 3,
              bgcolor: '#1E293B',
              border: '1px solid #334155',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <AssessmentIcon sx={{ color: '#A78BFA', fontSize: 30 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC', fontSize: '1.1rem' }}>
                Current Project Summary
              </Typography>
            </Box>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Card elevation={0} sx={{ borderRadius: 2, bgcolor: '#0F172A', border: '1px solid #334155' }}>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: getDebtLevelColor(debtLevel) }}>
                      {analysisData.technicalDebt.debtHours} hrs
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 500 }}>
                      Technical Debt ({totalDebt.toFixed(2)})
                    </Typography>
                    <Chip
                      label={debtLevel}
                      size="small"
                      sx={{
                        mt: 1,
                        bgcolor: getDebtLevelColor(debtLevel),
                        color: '#fff',
                        fontWeight: 600,
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card elevation={0} sx={{ borderRadius: 2, bgcolor: '#0F172A', border: '1px solid #334155' }}>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: getScoreColor(maintainabilityScore) }}>
                      {maintainabilityScore.toFixed(0)}/100
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 500 }}>
                      Maintainability Score
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card elevation={0} sx={{ borderRadius: 2, bgcolor: '#0F172A', border: '1px solid #334155' }}>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#60A5FA' }}>
                      {avgComplexity.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 500 }}>
                      Avg Complexity
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card elevation={0} sx={{ borderRadius: 2, bgcolor: '#0F172A', border: '1px solid #334155' }}>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: totalCodeSmells > 0 ? '#EF4444' : '#10B981' }}>
                      {totalCodeSmells}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 500 }}>
                      Code Smells
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: 3,
              bgcolor: '#1E293B',
              border: '1px solid #334155',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC', fontSize: '1.1rem' }}>
              Technical Debt Breakdown
            </Typography>
            {debtCategories.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {debtCategories.map((cat) => (
                  <Box key={cat.category} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#E2E8F0' }}>
                        {cat.category}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                        {cat.hours} hrs ({cat.debtScore.toFixed(2)})
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={cat.debtScore * 100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#0F172A',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getDebtLevelColor(cat.severity),
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: '#94A3B8' }}>
                      Severity: {cat.severity}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert icon={<InfoIcon />} severity="success" sx={{ mt: 2 }}>
                Zero technical debt categories reported for this project.
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: 3,
              bgcolor: '#1E293B',
              border: '1px solid #334155',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC', fontSize: '1.1rem' }}>
              Available Report Templates
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
              {reportTypes.map((type) => (
                <Chip
                  key={type.id}
                  label={type.name}
                  onClick={() => setSelectedReportType(type.id)}
                  icon={type.icon}
                  color={selectedReportType === type.id ? 'primary' : 'default'}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    bgcolor: selectedReportType === type.id ? '#4F46E5' : '#0F172A',
                    color: '#F8FAFC',
                    border: '1px solid #334155',
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
