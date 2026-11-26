import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material'
import {
  Speed as SpeedIcon,
  HealthAndSafety as HealthIcon,
  BugReport as BugReportIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import { useProject } from '../../contexts/ProjectContext'

export default function CodeQuality() {
  const { activeProject, analysisData } = useProject()

  if (!activeProject || !analysisData) {
    return null
  }

  const avgComplexity = analysisData.complexity.projectSummary.averageCyclomaticComplexity
  const maintainabilityScore = analysisData.maintainability.projectMaintainability.overallMaintainabilityScore
  const totalSmells = analysisData.codeSmells.statistics.totalSmells
  const highRiskMethods = analysisData.complexity.methodComplexityScores.filter(
    (m) => m.complexityLevel === 'High' || m.complexityLevel === 'Very High'
  )

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Code Quality
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Combined quality, maintainability, and complexity overview for {activeProject?.name || 'Active Project'}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <SpeedIcon sx={{ color: '#60A5FA', fontSize: 30 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                  {avgComplexity.toFixed(1)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                Avg Complexity
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <HealthIcon sx={{ color: maintainabilityScore >= 75 ? '#10B981' : '#F59E0B', fontSize: 30 }} />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: maintainabilityScore >= 75 ? '#10B981' : maintainabilityScore >= 50 ? '#F59E0B' : '#EF4444',
                  }}
                >
                  {Math.round(maintainabilityScore)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                Maintainability
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <BugReportIcon sx={{ color: totalSmells > 0 ? '#EF4444' : '#10B981', fontSize: 30 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                  {totalSmells}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                Code Smells
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <WarningIcon sx={{ color: highRiskMethods.length > 0 ? '#F59E0B' : '#10B981', fontSize: 30 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                  {highRiskMethods.length}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                High Risk Methods
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
          High Risk Methods
        </Typography>
        {highRiskMethods.length > 0 ? (
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Method Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Complexity</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Level</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {highRiskMethods.map((method, idx) => (
                  <TableRow key={`${method.className}-${method.methodName}-${idx}`}>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#93C5FD', borderColor: '#1E293B' }}>{method.methodName}</TableCell>
                    <TableCell sx={{ color: '#E2E8F0', borderColor: '#1E293B' }}>{method.className}</TableCell>
                    <TableCell sx={{ borderColor: '#1E293B' }}>
                      <Chip
                        label={method.cyclomaticComplexity}
                        size="small"
                        color={method.cyclomaticComplexity > 20 ? 'error' : 'warning'}
                      />
                    </TableCell>
                    <TableCell sx={{ borderColor: '#1E293B' }}>
                      <Chip
                        label={method.complexityLevel}
                        size="small"
                        color={method.complexityLevel === 'Very High' ? 'error' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mt: 2 }}>
            No high-risk methods detected. All methods maintain low cyclomatic complexity.
          </Alert>
        )}
      </Paper>
    </Box>
  )
}
