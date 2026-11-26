import { Box, Grid, Paper, Typography, Card, CardContent } from '@mui/material'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useProject } from '../../contexts/ProjectContext'

export default function AnalyticsDashboard() {
  const { activeProject, analysisData } = useProject()

  if (!activeProject || !analysisData) {
    return null
  }

  const maintainabilityDistribution = analysisData.maintainability.projectMaintainability.classMaintainabilities.reduce(
    (acc: Record<string, number>, cm) => {
      acc[cm.overallClassification] = (acc[cm.overallClassification] || 0) + 1
      return acc
    },
    {}
  )

  const maintainabilityChartData = Object.entries(maintainabilityDistribution).map(([name, value]) => ({
    name,
    value,
    color:
      name === 'Excellent'
        ? '#10B981'
        : name === 'Good'
        ? '#60A5FA'
        : name === 'Moderate'
        ? '#F59E0B'
        : '#EF4444',
  }))

  const complexityDistribution = analysisData.complexity.methodComplexityScores.reduce(
    (acc: Record<string, number>, score) => {
      acc[score.complexityLevel] = (acc[score.complexityLevel] || 0) + 1
      return acc
    },
    {}
  )

  const complexityChartData = Object.entries(complexityDistribution).map(([name, value]) => ({
    name,
    value,
  }))

  const overallMaintainability = analysisData.maintainability.projectMaintainability.overallMaintainabilityScore
  const overallComplexity = analysisData.complexity.projectSummary.averageCyclomaticComplexity
  const totalCodeSmells = analysisData.codeSmells.statistics.totalSmells
  const healthScore = Math.round(analysisData.technicalDebt.engineeringHealthScore.healthScore)

  const technicalDebtChartData = analysisData.technicalDebt.debtCategories.map((cat) => ({
    category: cat.category,
    value: cat.hours,
  }))

  const riskMetrics = [
    { name: 'High Risk Methods', value: analysisData.complexity.riskAnalysis.highRiskMethodCount },
    { name: 'Complex Methods', value: analysisData.complexity.riskAnalysis.complexMethodCount },
    { name: 'Large Classes', value: analysisData.complexity.riskAnalysis.largeClassCount },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Analytics Dashboard
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Quality metrics and technical debt analytics for {activeProject?.name || 'Active Project'}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Overall Health
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  mt: 1.5,
                  fontWeight: 700,
                  color: healthScore >= 70 ? '#10B981' : healthScore >= 50 ? '#F59E0B' : '#EF4444',
                }}
              >
                {healthScore}
              </Typography>
              <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                Health Score / 100
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Maintainability
              </Typography>
              <Typography variant="h3" sx={{ mt: 1.5, fontWeight: 700, color: '#60A5FA' }}>
                {Math.round(overallMaintainability)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                Score / 100
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Avg Complexity
              </Typography>
              <Typography variant="h3" sx={{ mt: 1.5, fontWeight: 700, color: '#A78BFA' }}>
                {overallComplexity.toFixed(1)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                Cyclomatic
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Code Smells
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  mt: 1.5,
                  fontWeight: 700,
                  color: totalCodeSmells > 0 ? '#EF4444' : '#10B981',
                }}
              >
                {totalCodeSmells}
              </Typography>
              <Typography variant="body2" sx={{ color: '#CBD5E1' }}>
                Total Issues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Maintainability Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={maintainabilityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={85}
                  dataKey="value"
                >
                  {maintainabilityChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Complexity Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={complexityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#CBD5E1' }} />
                <YAxis tick={{ fill: '#CBD5E1' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }} />
                <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                <Bar dataKey="value" name="Methods" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Risk Metrics
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={riskMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#CBD5E1' }} />
                <YAxis tick={{ fill: '#CBD5E1' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }} />
                <Bar dataKey="value" name="Count" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Technical Debt Breakdown (Hours)
            </Typography>
            {technicalDebtChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={technicalDebtChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#CBD5E1' }} />
                  <YAxis dataKey="category" type="category" width={140} tick={{ fill: '#CBD5E1', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }} />
                  <Bar dataKey="value" name="Debt Hours" fill="#F59E0B" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" sx={{ color: '#10B981', fontWeight: 600 }}>
                  0 Hours of Technical Debt Recorded
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
