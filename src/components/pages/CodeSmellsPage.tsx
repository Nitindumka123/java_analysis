import { useMemo } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  OpenInNew as OpenInNewIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import { useProject } from '../../contexts/ProjectContext'
import type { BackendSmellItem, SmellReferenceLink } from '../../types'

const OFFICIAL_JAVA_DOC_REFERENCES: Record<string, SmellReferenceLink[]> = {
  HIGH_COMPLEXITY: [
    {
      title: 'Oracle Java SE Tutorial — Control Flow Statements',
      uri: 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/flow.html',
    },
    {
      title: 'PMD Java Rules — CyclomaticComplexity',
      uri: 'https://docs.pmd-code.org/latest/pmd_rules_java_design.html#cyclomaticcomplexity',
    },
  ],
  DEEP_NESTING: [
    {
      title: 'Oracle Java SE Tutorial — Branching Statements',
      uri: 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/branch.html',
    },
    {
      title: 'PMD Java Rules — AvoidDeeplyNestedIfStmts',
      uri: 'https://docs.pmd-code.org/latest/pmd_rules_java_design.html#avoiddeeplynestedifstmts',
    },
  ],
  LONG_METHOD: [
    {
      title: 'Oracle Java SE Tutorial — Defining Methods',
      uri: 'https://docs.oracle.com/javase/tutorial/java/javaOO/methods.html',
    },
    {
      title: 'PMD Java Rules — ExcessiveMethodLength',
      uri: 'https://docs.pmd-code.org/latest/pmd_rules_java_design.html#excessivemethodlength',
    },
  ],
  GOD_CLASS: [
    {
      title: 'Oracle Java SE Tutorial — Classes and Objects',
      uri: 'https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html',
    },
    {
      title: 'PMD Java Rules — GodClass',
      uri: 'https://docs.pmd-code.org/latest/pmd_rules_java_design.html#godclass',
    },
  ],
  DUPLICATE_CODE: [
    {
      title: 'Oracle Java SE Tutorial — Inheritance & Code Reuse',
      uri: 'https://docs.oracle.com/javase/tutorial/java/IandI/subclasses.html',
    },
    {
      title: 'PMD CPD — Copy/Paste Detector for Java',
      uri: 'https://docs.pmd-code.org/latest/pmd_userdocs_cpd.html',
    },
  ],
}

export default function CodeSmellsPage() {
  const { activeProject, analysisData } = useProject()

  const smells = activeProject?.smells ?? []

  const uniqueSmellTypes = useMemo(() => {
    return Array.from(new Set(smells.map((s) => s.type || 'Unknown').filter(Boolean)))
  }, [smells])

  if (!activeProject || !analysisData) {
    return null
  }

  const { statistics } = analysisData.codeSmells

  const smellsByType = smells.reduce((acc: Record<string, BackendSmellItem[]>, smell) => {
    const type = smell.type || 'Unknown'
    if (!acc[type]) acc[type] = []
    acc[type].push(smell)
    return acc
  }, {})

  const smellsBySeverity = smells.reduce((acc: Record<string, BackendSmellItem[]>, smell) => {
    const severity = smell.severity || 'Medium'
    if (!acc[severity]) acc[severity] = []
    acc[severity].push(smell)
    return acc
  }, {})

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'error'
      case 'MEDIUM':
        return 'warning'
      case 'LOW':
        return 'info'
      default:
        return 'default'
    }
  }

  const getReferencesForSmell = (smell: BackendSmellItem): SmellReferenceLink[] => {
    const backendRefs = smell.references || []
    const fallbackRefs = OFFICIAL_JAVA_DOC_REFERENCES[smell.type] || [
      {
        title: 'Oracle Java SE Documentation',
        uri: 'https://docs.oracle.com/javase/tutorial/java/index.html',
      },
    ]

    const combined = [...backendRefs, ...fallbackRefs]
    const seen = new Set<string>()
    const deduped: SmellReferenceLink[] = []
    for (const ref of combined) {
      if (ref?.uri && !seen.has(ref.uri)) {
        seen.add(ref.uri)
        deduped.push(ref)
      }
    }
    return deduped.slice(0, 3)
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC', mb: 0.5 }}>
          Code Smells
        </Typography>
        <Typography variant="body1" sx={{ color: '#94A3B8' }}>
          Static smell detection for {activeProject?.name || 'Active Project'} cross-referenced with official Java documentation & best practices
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <BugReportIcon sx={{ color: statistics.totalSmells > 0 ? '#F59E0B' : '#10B981', fontSize: 32 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                  {statistics.totalSmells}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                Total Smells
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <ErrorIcon sx={{ color: '#EF4444', fontSize: 32 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                  {statistics.criticalSmells}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                Critical
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <WarningIcon sx={{ color: '#F59E0B', fontSize: 32 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                  {statistics.highSmells}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                High Severity
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <InfoIcon sx={{ color: '#60A5FA', fontSize: 32 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                  {statistics.mediumSmells}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                Medium Severity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Smell Statistics
            </Typography>
            <Box sx={{ mt: 2 }}>
              {[
                ['Total Smells', statistics.totalSmells],
                ['Long Methods', statistics.longMethods],
                ['Long Classes', statistics.longClasses],
                ['Duplicate Code', statistics.duplicateCode],
                ['Feature Envy', statistics.featureEnvy],
                ['God Classes', statistics.godClasses],
              ].map(([label, value], idx) => (
                <Box
                  key={label}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 1.25,
                    borderBottom: idx < 5 ? '1px solid #334155' : 'none',
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
              Smells by Severity
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 3 }}>
              {Object.entries(smellsBySeverity).map(([severity, items]) => (
                <Chip
                  key={severity}
                  label={`${severity}: ${items.length}`}
                  color={getSeverityColor(severity) as any}
                  sx={{ fontWeight: 600 }}
                />
              ))}
              {Object.keys(smellsBySeverity).length === 0 && (
                <Box
                  sx={{
                    width: '100%',
                    p: 2.5,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(16, 185, 129, 0.10)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <CheckCircleIcon sx={{ color: '#10B981', fontSize: 28 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#34D399', fontWeight: 700 }}>
                      No issues found. Your code is clean!
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#A7F3D0' }}>
                      No code smells detected — all static quality checks passed.
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
          Detected Code Smells ({smells.length})
        </Typography>
        {smells.length > 0 ? (
          <Box sx={{ mt: 2 }}>
            {Object.entries(smellsByType).map(([type, typeSmells]) => (
              <Accordion
                key={type}
                defaultExpanded
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: '#0F172A',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#94A3B8' }} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                      {type}
                    </Typography>
                    <Chip label={typeSmells.length} size="small" color="primary" sx={{ fontWeight: 600 }} />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer
                    className="dark-scroll-container"
                    sx={{ maxHeight: 420, overflowY: 'auto', borderRadius: 2, border: '1px solid #1E293B' }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: '#94A3B8', bgcolor: '#0F172A', borderColor: '#334155' }}>
                            Description
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#94A3B8', bgcolor: '#0F172A', borderColor: '#334155' }}>
                            Severity
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#94A3B8', bgcolor: '#0F172A', borderColor: '#334155' }}>
                            Class
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#94A3B8', bgcolor: '#0F172A', borderColor: '#334155' }}>
                            Method
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#94A3B8', bgcolor: '#0F172A', borderColor: '#334155' }}>
                            File
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#94A3B8', bgcolor: '#0F172A', borderColor: '#334155' }}>
                            Line
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#94A3B8', bgcolor: '#0F172A', borderColor: '#334155', minWidth: 190 }}>
                            Reference
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {typeSmells.map((smell) => {
                          const refs = getReferencesForSmell(smell)
                          return (
                            <TableRow key={smell.id} hover sx={{ '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.06)' } }}>
                              <TableCell sx={{ color: '#E2E8F0', borderColor: '#1E293B' }}>{smell.issue}</TableCell>
                              <TableCell sx={{ borderColor: '#1E293B' }}>
                                <Chip label={smell.severity} size="small" color={getSeverityColor(smell.severity) as any} />
                              </TableCell>
                              <TableCell sx={{ color: '#CBD5E1', borderColor: '#1E293B' }}>{smell.className}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', color: '#93C5FD', borderColor: '#1E293B' }}>
                                {smell.methodName}
                              </TableCell>
                              <TableCell sx={{ color: '#CBD5E1', borderColor: '#1E293B' }}>{smell.file}</TableCell>
                              <TableCell sx={{ color: '#94A3B8', borderColor: '#1E293B' }}>{smell.lineNumber}</TableCell>
                              <TableCell sx={{ borderColor: '#1E293B' }}>
                                <Stack direction="column" spacing={0.5}>
                                  {refs.map((ref, idx) => (
                                    <Tooltip key={`${smell.id}-ref-${idx}`} title={ref.title} placement="top" arrow>
                                      <Link
                                        href={ref.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        underline="hover"
                                        data-testid="smell-reference-link"
                                        sx={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 0.5,
                                          color: '#818CF8',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          '&:hover': { color: '#A5B4FC' },
                                        }}
                                      >
                                        <OpenInNewIcon sx={{ fontSize: 13 }} />
                                        <Typography
                                          component="span"
                                          variant="caption"
                                          noWrap
                                          sx={{ fontWeight: 600, maxWidth: 180 }}
                                        >
                                          Reference: {ref.title}
                                        </Typography>
                                      </Link>
                                    </Tooltip>
                                  ))}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ) : (
          <Box
            data-testid="clean-empty-state"
            sx={{
              mt: 2,
              py: 6,
              px: 3,
              textAlign: 'center',
              borderRadius: 3,
              bgcolor: '#0F172A',
              border: '1px dashed rgba(16, 185, 129, 0.35)',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 36, color: '#10B981' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#F8FAFC', mb: 0.75 }}>
              No issues found. Your code is clean!
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', maxWidth: 460, mx: 'auto' }}>
              Zero code smells were detected across all parsed classes and methods. This codebase adheres to clean engineering standards.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
