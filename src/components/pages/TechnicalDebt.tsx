import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material'
import {
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import { useProject } from '../../contexts/ProjectContext'

export default function TechnicalDebt() {
  const { activeProject, analysisData } = useProject()

  if (!activeProject || !analysisData) {
    return null
  }

  const {
    debtHours,
    overallTechnicalDebtScore,
    overallDebtLevel,
    engineeringHealthScore,
    projectHealthSummary,
    debtCategories,
    riskRankings,
    recommendations,
    improvementTasks,
  } = analysisData.technicalDebt

  const getDebtColor = (score: number) => {
    if (score >= 0.7) return '#EF4444'
    if (score >= 0.4) return '#F59E0B'
    return '#10B981'
  }

  const getDebtLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'error'
      case 'MEDIUM':
        return 'warning'
      default:
        return 'success'
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Technical Debt
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Technical debt estimation and remediation plan for {activeProject?.name || 'Active Project'}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <WarningIcon sx={{ color: getDebtColor(overallTechnicalDebtScore), fontSize: 40 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                      Estimated Technical Debt
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: getDebtColor(overallTechnicalDebtScore) }}>
                      {debtHours} hours
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`Debt Level: ${overallDebtLevel}`}
                  color={getDebtLevelColor(overallDebtLevel) as any}
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Debt Ratio Score
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                    {overallTechnicalDebtScore.toFixed(2)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, overallTechnicalDebtScore * 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#0F172A',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getDebtColor(overallTechnicalDebtScore),
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>

              <Box sx={{ mt: 3 }}>
                {[
                  ['Engineering Health Score', `${engineeringHealthScore.healthScore.toFixed(1)}/100`],
                  ['Health Level', engineeringHealthScore.healthLevel],
                  ['Total Issues', engineeringHealthScore.totalIssues],
                ].map(([label, value], idx) => (
                  <Box
                    key={label as string}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: idx < 2 ? '1px solid #334155' : 'none',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Project Health Summary
            </Typography>
            <Box sx={{ mt: 2 }}>
              {[
                ['Project Name', projectHealthSummary.projectName],
                ['Overall Health', projectHealthSummary.overallHealthLevel],
                ['Total Classes', projectHealthSummary.totalClasses],
                ['Total Methods', projectHealthSummary.totalMethods],
                ['Total Packages', projectHealthSummary.totalPackages],
              ].map(([label, value], idx) => (
                <Box
                  key={label as string}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 1.5,
                    borderBottom: idx < 4 ? '1px solid #334155' : 'none',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Debt Categories
            </Typography>
            {debtCategories.length > 0 ? (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Hours</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Score</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Severity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {debtCategories.map((cat) => (
                      <TableRow key={cat.category}>
                        <TableCell sx={{ color: '#E2E8F0', borderColor: '#1E293B' }}>{cat.category}</TableCell>
                        <TableCell sx={{ color: '#F8FAFC', fontWeight: 600, borderColor: '#1E293B' }}>{cat.hours}h</TableCell>
                        <TableCell sx={{ borderColor: '#1E293B' }}>
                          <Chip
                            label={cat.score.toFixed(2)}
                            size="small"
                            color={cat.score > 0.6 ? 'error' : cat.score > 0.35 ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell sx={{ borderColor: '#1E293B' }}>
                          <Chip
                            label={cat.severity}
                            size="small"
                            color={cat.severity === 'Critical' || cat.severity === 'High' ? 'error' : 'warning'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mt: 2 }}>
                0 hours of technical debt — no debt categories flagged.
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Risk Rankings
            </Typography>
            {riskRankings.length > 0 ? (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Entity</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Risk Score</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {riskRankings.map((risk) => (
                      <TableRow key={risk.entityName}>
                        <TableCell sx={{ fontFamily: 'monospace', color: '#93C5FD', borderColor: '#1E293B' }}>
                          {risk.entityName}
                        </TableCell>
                        <TableCell sx={{ borderColor: '#1E293B' }}>
                          <Chip
                            label={risk.riskScore.toFixed(2)}
                            size="small"
                            color={risk.riskScore > 0.7 ? 'error' : risk.riskScore > 0.45 ? 'warning' : 'info'}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#CBD5E1', borderColor: '#1E293B' }}>{risk.riskType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mt: 2 }}>
                No high-risk entities detected.
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <AssignmentIcon sx={{ color: '#818CF8' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                Recommendations
              </Typography>
            </Box>
            <List>
              {recommendations.map((rec, idx) => (
                <ListItem key={`${rec.title}-${idx}`} sx={{ px: 0 }}>
                  <ListItemText
                    primary={<Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{rec.title}</Typography>}
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <Box sx={{ mt: 0.75, display: 'flex', gap: 1 }}>
                        <Chip
                          label={`Priority: ${rec.priority}`}
                          size="small"
                          color={rec.priority === 'Critical' || rec.priority === 'High' ? 'error' : 'default'}
                        />
                        <Chip label={`Impact: ${rec.impact}`} size="small" variant="outlined" sx={{ color: '#CBD5E1', borderColor: '#475569' }} />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <BuildIcon sx={{ color: '#A78BFA' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                Improvement Tasks
              </Typography>
            </Box>
            {improvementTasks.length > 0 ? (
              <List>
                {improvementTasks.map((task, idx) => (
                  <ListItem key={`${task.title}-${idx}`} sx={{ px: 0 }}>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{task.title}</Typography>}
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box sx={{ mt: 0.75, display: 'flex', gap: 1 }}>
                          <Chip label={`Effort: ${task.effort}`} size="small" variant="outlined" sx={{ color: '#CBD5E1', borderColor: '#475569' }} />
                          <Chip label={`Category: ${task.category}`} size="small" variant="outlined" sx={{ color: '#CBD5E1', borderColor: '#475569' }} />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert icon={<CheckCircleIcon />} severity="success">
                No remediation tasks needed.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
