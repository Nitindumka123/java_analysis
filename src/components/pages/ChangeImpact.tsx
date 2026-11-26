import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material'
import {
  AccountTree as TreeIcon,
  SubdirectoryArrowRight as HopIcon,
  Security as RiskIcon,
} from '@mui/icons-material'
// @ts-ignore - No type definitions available for react-cytoscapejs
import CytoscapeComponent from 'react-cytoscapejs'
import toast from 'react-hot-toast'
import { useProject } from '../../contexts/ProjectContext'
import { apiService } from '../../services/api'
import type { ChangeImpactResult } from '../../types'

export default function ChangeImpact() {
  const { activeProject, analysisData } = useProject()
  const cyRef = useRef<any>(null)
  const [impactState, setImpactState] = useState<ChangeImpactResult | null>(analysisData?.impact || null)
  const [selectedClass, setSelectedClass] = useState<string>(analysisData?.impact?.target || '')
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (analysisData?.impact) {
      setImpactState(analysisData.impact)
      setSelectedClass(analysisData.impact.target)
    }
  }, [analysisData?.impact])

  const classOptions = useMemo(() => {
    const names = new Set<string>()
    for (const dep of activeProject?.dependencies || []) {
      const srcLabel = dep.source.split('.').pop() || dep.source
      const tgtLabel = dep.target.split('.').pop() || dep.target
      if (srcLabel) names.add(srcLabel)
      if (tgtLabel) names.add(tgtLabel)
    }
    for (const node of analysisData?.dependencyDetails?.classGraph?.nodes || []) {
      if (node.label) names.add(node.label)
    }
    for (const cls of analysisData?.structural?.files || []) {
      if (cls.className) names.add(cls.className)
    }
    return Array.from(names).sort()
  }, [activeProject?.dependencies, analysisData?.dependencyDetails?.classGraph?.nodes, analysisData?.structural?.files])

  const filteredClassOptions = useMemo(() => {
    const q = searchFilter.trim().toLowerCase()
    if (!q) return classOptions
    return classOptions.filter((name) => name.toLowerCase().includes(q))
  }, [classOptions, searchFilter])

  if (!activeProject || !analysisData || !impactState) {
    return null
  }

  const handleSelectClass = async (targetName: string) => {
    setSelectedClass(targetName)
    setLoading(true)
    setError(null)
    try {
      const updated = await apiService.analyzeImpact(activeProject.path, targetName)
      setImpactState(updated)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
      const msg =
        axiosErr?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to compute reverse-graph impact.')
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const elements = [
    ...(impactState.traversalResult?.nodes || []).map((node) => ({
      data: {
        id: node.id,
        label: node.label || node.id.split('.').pop() || node.id,
        role: node.role,
      },
    })),
    ...(impactState.traversalResult?.edges || []).map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
      },
    })),
  ]

  const riskColor =
    impactState.riskLevel === 'HIGH' ? '#EF4444' : impactState.riskLevel === 'MEDIUM' ? '#F59E0B' : '#10B981'

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Change Impact
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Reverse-graph BFS blast radius analysis across class dependencies in {activeProject?.name || 'Active Project'}
      </Typography>

      {/* Class Selector & Filter */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              label="Filter Classes"
              placeholder="Search class name (e.g. GodClass)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': { bgcolor: '#0F172A', color: '#F8FAFC', borderRadius: 2 },
                '& .MuiInputLabel-root': { color: '#94A3B8' },
              }}
            />
          </Grid>
          <Grid item xs={12} md={7}>
            <FormControl fullWidth size="small">
              <InputLabel id="target-class-select-label" sx={{ color: '#94A3B8' }}>
                Target Class
              </InputLabel>
              <Select
                labelId="target-class-select-label"
                value={filteredClassOptions.includes(selectedClass) ? selectedClass : selectedClass || ''}
                label="Target Class"
                disabled={loading}
                onChange={(e) => handleSelectClass(String(e.target.value))}
                sx={{ bgcolor: '#0F172A', color: '#F8FAFC', borderRadius: 2 }}
              >
                {filteredClassOptions.map((clsName) => (
                  <MenuItem key={clsName} value={clsName}>
                    {clsName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {loading && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
            <CircularProgress size={18} sx={{ color: '#818CF8' }} />
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Running reverse-graph BFS traversal for {selectedClass}...
            </Typography>
          </Stack>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Target Class
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#FBBF24', fontFamily: 'monospace' }}>
                {impactState.target}
              </Typography>
              <Typography variant="body2" sx={{ color: '#CBD5E1', mt: 1 }}>
                Total Impacted Dependents:{' '}
                <strong>{impactState.directDependents.length + impactState.indirectDependents.length}</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Dependent Breakdown
              </Typography>
              <Typography variant="body1" sx={{ color: '#FCA5A5', mt: 1.5, fontWeight: 600 }}>
                Direct Dependents: <strong>{impactState.directDependents.length}</strong>
              </Typography>
              <Typography variant="body1" sx={{ color: '#A5B4FC', mt: 0.75, fontWeight: 600 }}>
                Indirect Dependents: <strong>{impactState.indirectDependents.length}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 1 }}>
                BFS Max Depth: {impactState.traversalResult?.maxDepth ?? 0} hops
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RiskIcon sx={{ color: riskColor }} />
                <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                  Change Risk Score
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ mt: 1, fontWeight: 700, color: riskColor }}>
                {impactState.riskScore}/100
              </Typography>
              <Chip
                label={`${impactState.riskLevel} RISK`}
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: `${riskColor}25`,
                  color: riskColor,
                  fontWeight: 700,
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Direct vs Indirect Dependents Tree */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TreeIcon sx={{ color: '#EF4444' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                Direct Dependents (Hop 1)
              </Typography>
            </Box>
            {impactState.directDependents.length > 0 ? (
              <List dense>
                {impactState.directDependents.map((dep) => (
                  <ListItem
                    key={`direct-${dep}`}
                    sx={{ mb: 1, borderRadius: 2, bgcolor: '#0F172A', border: '1px solid rgba(239, 68, 68, 0.35)' }}
                  >
                    <HopIcon sx={{ color: '#EF4444', mr: 1.5 }} />
                    <ListItemText
                      primary={<Typography sx={{ color: '#F8FAFC', fontFamily: 'monospace', fontWeight: 600 }}>{dep}</Typography>}
                      secondary={<Typography variant="caption" sx={{ color: '#FCA5A5' }}>Directly imports or calls {impactState.target}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No direct dependents reference {impactState.target}.
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TreeIcon sx={{ color: '#818CF8' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                Indirect Dependents (Hop 2+)
              </Typography>
            </Box>
            {impactState.indirectDependents.length > 0 ? (
              <List dense>
                {impactState.indirectDependents.map((dep) => (
                  <ListItem
                    key={`indirect-${dep}`}
                    sx={{ mb: 1, borderRadius: 2, bgcolor: '#0F172A', border: '1px solid rgba(129, 140, 248, 0.35)' }}
                  >
                    <HopIcon sx={{ color: '#818CF8', mr: 1.5 }} />
                    <ListItemText
                      primary={<Typography sx={{ color: '#F8FAFC', fontFamily: 'monospace', fontWeight: 600 }}>{dep}</Typography>}
                      secondary={<Typography variant="caption" sx={{ color: '#A5B4FC' }}>Transitively impacted via upstream class dependency</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No indirect (transitive) dependents detected for {impactState.target}.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Impact Graph */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
          Impact Propagation Graph
        </Typography>
        <Box sx={{ height: 380, mt: 2, bgcolor: '#0F172A', border: '1px solid #334155', borderRadius: 2, overflow: 'hidden' }}>
          <CytoscapeComponent
            key={`${activeProject.path}-${impactState.target}`}
            elements={elements}
            style={{ width: '100%', height: '100%' }}
            stylesheet={[
              {
                selector: 'node',
                style: {
                  'background-color': '#4F46E5',
                  label: 'data(label)',
                  color: '#F8FAFC',
                  'font-size': '11px',
                  'text-valign': 'bottom',
                  'text-margin-y': 6,
                  width: '44px',
                  height: '44px',
                },
              },
              {
                selector: 'node[role="target"]',
                style: {
                  'background-color': '#F59E0B',
                  'border-width': 3,
                  'border-color': '#FDE68A',
                },
              },
              {
                selector: 'node[role="direct"]',
                style: {
                  'background-color': '#EF4444',
                },
              },
              {
                selector: 'node[role="indirect"]',
                style: {
                  'background-color': '#818CF8',
                },
              },
              {
                selector: 'edge',
                style: {
                  width: 2,
                  'line-color': '#64748B',
                  'target-arrow-color': '#64748B',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                },
              },
            ]}
            layout={{ name: 'cose', fit: true, padding: 40 }}
            cy={(cy: any) => {
              cyRef.current = cy
            }}
          />
        </Box>
      </Paper>
    </Box>
  )
}
