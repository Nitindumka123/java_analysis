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
} from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useProject } from '../../contexts/ProjectContext'

export default function Complexity() {
  const { activeProject, analysisData } = useProject()

  if (!activeProject || !analysisData) {
    return null
  }

  const { complexityScore, projectSummary, riskAnalysis, methodComplexityScores } = analysisData.complexity

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Very High':
      case 'High':
        return 'error'
      case 'Medium':
        return 'warning'
      default:
        return 'success'
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Complexity Analysis
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Cyclomatic complexity metrics and hotspots for {activeProject?.name || 'Active Project'}
      </Typography>

      {/* Summary KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Complexity Score
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mt: 1,
                  color: complexityScore >= 70 ? '#EF4444' : complexityScore >= 35 ? '#F59E0B' : '#10B981',
                }}
              >
                {complexityScore}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Average Cyclomatic
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, color: '#60A5FA' }}>
                {projectSummary.averageCyclomaticComplexity.toFixed(1)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Max Method Complexity
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mt: 1,
                  color: projectSummary.maxComplexity > 15 ? '#EF4444' : '#10B981',
                }}
              >
                {projectSummary.maxComplexity}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                High Complexity Methods
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mt: 1,
                  color: projectSummary.highComplexityMethods > 0 ? '#F59E0B' : '#10B981',
                }}
              >
                {projectSummary.highComplexityMethods}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Method Complexity Hotspots
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={methodComplexityScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="methodName" tick={{ fill: '#CBD5E1', fontSize: 11 }} />
                <YAxis tick={{ fill: '#CBD5E1', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#F8FAFC',
                  }}
                />
                <Bar
                  dataKey="cyclomaticComplexity"
                  name="Cyclomatic Complexity"
                  fill={complexityScore >= 70 ? '#EF4444' : '#60A5FA'}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Risk Analysis
            </Typography>
            <Box sx={{ mt: 2 }}>
              {[
                ['Low Risk Methods', riskAnalysis.lowRisk, '#10B981'],
                ['Medium Risk Methods', riskAnalysis.mediumRisk, '#F59E0B'],
                ['High Risk Methods', riskAnalysis.highRisk, '#F97316'],
                ['Very High Risk Methods', riskAnalysis.veryHighRisk, '#EF4444'],
              ].map(([label, count, color], idx) => (
                <Box
                  key={label as string}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 1.5,
                    borderBottom: idx < 3 ? '1px solid #334155' : 'none',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: color as string }}>
                    {count}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
          Method Complexity Breakdown
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>File</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>LOC</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Complexity</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#94A3B8', borderColor: '#334155' }}>Level</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {methodComplexityScores.map((method, idx) => (
                <TableRow key={`${method.className}-${method.methodName}-${idx}`}>
                  <TableCell sx={{ fontFamily: 'monospace', color: '#93C5FD', borderColor: '#1E293B' }}>
                    {method.methodName}
                  </TableCell>
                  <TableCell sx={{ color: '#E2E8F0', borderColor: '#1E293B' }}>{method.className}</TableCell>
                  <TableCell sx={{ color: '#94A3B8', borderColor: '#1E293B' }}>{method.fileName}</TableCell>
                  <TableCell sx={{ color: '#CBD5E1', borderColor: '#1E293B' }}>{method.linesOfCode}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#F8FAFC', borderColor: '#1E293B' }}>
                    {method.cyclomaticComplexity}
                  </TableCell>
                  <TableCell sx={{ borderColor: '#1E293B' }}>
                    <Chip
                      label={method.complexityLevel}
                      size="small"
                      color={getLevelColor(method.complexityLevel) as any}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
