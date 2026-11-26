import { Box, Grid, Card, CardContent, Typography, Paper, Chip, Button } from '@mui/material'
import {
  Description as DescriptionIcon,
  Class as ClassIcon,
  Code as CodeIcon,
  FormatListNumbered as LinesIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  BugReport as BugReportIcon,
  Loop as LoopIcon,
  HealthAndSafety as HealthIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../../contexts/ProjectContext'

export default function MainDashboard() {
  const { activeProject, analysisData } = useProject()
  const navigate = useNavigate()

  if (!activeProject || !analysisData) {
    return null
  }

  const { complexity, maintainability, codeSmells, technicalDebt, dependencyDetails, qualityChartData, riskLevel } =
    analysisData

  const riskConfig = {
    HIGH: {
      label: 'HIGH RISK',
      color: '#F43F5E',
      bg: 'rgba(244, 63, 94, 0.10)',
      border: 'rgba(244, 63, 94, 0.20)',
      desc: 'Critical complexity, technical debt, and circular dependencies require refactoring.',
    },
    MEDIUM: {
      label: 'MEDIUM RISK',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.10)',
      border: 'rgba(245, 158, 11, 0.20)',
      desc: 'Moderate complexity and localized code smells detected across modules.',
    },
    LOW: {
      label: 'LOW RISK',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.10)',
      border: 'rgba(16, 185, 129, 0.20)',
      desc: 'Healthy codebase with low complexity, zero debt, and clean dependencies.',
    },
  }[riskLevel]

  const overviewCards = [
    { title: 'Total Files', value: activeProject.metrics.files.toLocaleString(), icon: <DescriptionIcon />, color: '#60A5FA' },
    { title: 'Total Classes', value: activeProject.metrics.classes.toLocaleString(), icon: <ClassIcon />, color: '#A78BFA' },
    { title: 'Total Methods', value: activeProject.metrics.methods.toLocaleString(), icon: <CodeIcon />, color: '#38BDF8' },
    { title: 'Lines of Code', value: activeProject.metrics.linesOfCode.toLocaleString(), icon: <LinesIcon />, color: '#34D399' },
  ]

  const metricCards = [
    {
      title: 'Complexity Score',
      value: `${activeProject.metrics.complexity}/100`,
      subtitle: `Avg CC: ${complexity.projectSummary.averageCyclomaticComplexity.toFixed(1)}`,
      icon: <SpeedIcon />,
      color: activeProject.metrics.complexity >= 70 ? '#EF4444' : activeProject.metrics.complexity >= 35 ? '#F59E0B' : '#10B981',
      route: '/complexity',
    },
    {
      title: 'Technical Debt',
      value: `${technicalDebt.debtHours} hrs`,
      subtitle: `Level: ${technicalDebt.overallDebtLevel}`,
      icon: <WarningIcon />,
      color: technicalDebt.debtHours >= 8 ? '#EF4444' : technicalDebt.debtHours > 0 ? '#F59E0B' : '#10B981',
      route: '/debt',
    },
    {
      title: 'Code Smells',
      value: activeProject.smells.length.toString(),
      subtitle: `${codeSmells.statistics.criticalSmells} critical issues`,
      icon: <BugReportIcon />,
      color: activeProject.smells.length >= 10 ? '#EF4444' : activeProject.smells.length > 0 ? '#F59E0B' : '#10B981',
      route: '/smells',
    },
    {
      title: 'Dependency Cycles',
      value: dependencyDetails.metadata.circularDependenciesCount.toString(),
      subtitle: `${dependencyDetails.metadata.totalNodes} nodes mapped`,
      icon: <LoopIcon />,
      color: dependencyDetails.metadata.circularDependenciesCount > 0 ? '#EF4444' : '#10B981',
      route: '/dependencies',
    },
    {
      title: 'Maintainability',
      value: `${Math.round(maintainability.projectMaintainability.overallMaintainabilityScore)}/100`,
      subtitle: maintainability.projectMaintainability.maintainabilityLevel,
      icon: <HealthIcon />,
      color:
        maintainability.projectMaintainability.overallMaintainabilityScore >= 75
          ? '#10B981'
          : maintainability.projectMaintainability.overallMaintainabilityScore >= 50
          ? '#F59E0B'
          : '#EF4444',
      route: '/quality',
    },
  ]

  const riskBreakdownData = [
    { name: 'Low Risk', value: complexity.riskAnalysis.lowRisk, color: '#10B981' },
    { name: 'Medium Risk', value: complexity.riskAnalysis.mediumRisk, color: '#F59E0B' },
    { name: 'High Risk', value: complexity.riskAnalysis.highRisk, color: '#F97316' },
    { name: 'Very High Risk', value: complexity.riskAnalysis.veryHighRisk, color: '#EF4444' },
  ].filter((d) => d.value > 0)

  return (
    <Box>
      {/* Header + Risk Indicator */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
            Engineering Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: '#94A3B8', mt: 0.5 }}>
            {activeProject?.name || 'Project'} &middot; <span style={{ fontFamily: 'monospace' }}>{activeProject?.path}</span>
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            px: 3,
            py: 1.5,
            borderRadius: 3,
            bgcolor: riskConfig.bg,
            border: `1px solid ${riskConfig.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: riskConfig.color,
              boxShadow: `0 0 12px ${riskConfig.color}`,
            }}
          />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: riskConfig.color, letterSpacing: '0.04em' }}>
                {riskConfig.label}
              </Typography>
              <Chip
                size="small"
                label={`Health ${Math.round(technicalDebt.engineeringHealthScore.healthScore)}/100`}
                sx={{ bgcolor: 'rgba(15, 23, 42, 0.7)', color: '#F8FAFC', fontWeight: 600, fontSize: '0.75rem' }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#E2E8F0', display: 'block', mt: 0.25 }}>
              {riskConfig.desc}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Overview Cards */}
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
        Codebase Overview
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }} data-testid="overview-grid">
        {overviewCards.map((card) => (
          <Grid item xs={12} md={6} lg={3} key={card.title}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                bgcolor: '#1E293B',
                border: '1px solid #334155',
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    {card.title}
                  </Typography>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: `${card.color}20`,
                      color: card.color,
                      display: 'flex',
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quality & Risk Metric Cards */}
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
        Quality, Debt & Risk Indicators
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }} data-testid="metrics-grid">
        {metricCards.map((card) => (
          <Grid item xs={12} md={6} lg={3} key={card.title}>
            <Card
              elevation={0}
              onClick={() => navigate(card.route)}
              sx={{
                borderRadius: 3,
                bgcolor: '#1E293B',
                border: '1px solid #334155',
                borderTop: `3px solid ${card.color}`,
                cursor: 'pointer',
                height: '100%',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  borderColor: card.color,
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    {card.title}
                  </Typography>
                  <Box sx={{ color: card.color, display: 'flex' }}>{card.icon}</Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: card.color, mb: 0.5 }}>
                  {card.value}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#CBD5E1' }}>
                    {card.subtitle}
                  </Typography>
                  <ArrowForwardIcon sx={{ fontSize: 14, color: '#64748B' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: '#1E293B',
              border: '1px solid #334155',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                  Code Quality: Complexity vs. Maintainability
                </Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                  Module-level comparison across primary classes
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/complexity')}
                sx={{ color: '#818CF8', textTransform: 'none', fontWeight: 600 }}
              >
                View Complexity
              </Button>
            </Box>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={qualityChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#CBD5E1', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#CBD5E1', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#F8FAFC',
                  }}
                />
                <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                <Bar dataKey="complexity" name="Complexity Index" fill="#6366F1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="maintainability" name="Maintainability Score" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: '#1E293B',
              border: '1px solid #334155',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                Method Risk Distribution
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
                Breakdown of {activeProject.metrics.methods} analyzed methods
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={riskBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskBreakdownData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#F8FAFC',
                  }}
                />
                <Legend wrapperStyle={{ color: '#E2E8F0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/smells')}
                sx={{ borderColor: '#334155', color: '#E2E8F0', textTransform: 'none' }}
              >
                Inspect Smells ({codeSmells.statistics.totalSmells})
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/dependencies')}
                sx={{ borderColor: '#334155', color: '#E2E8F0', textTransform: 'none' }}
              >
                Dependency Graph
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
