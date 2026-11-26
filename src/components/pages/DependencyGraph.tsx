import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  Tabs,
  Tab,
  Alert,
  Button,
  Stack,
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CenterFocusStrong as FitIcon,
  AccountTree as LayoutIcon,
} from '@mui/icons-material'
// @ts-ignore - No type definitions available for react-cytoscapejs
import CytoscapeComponent from 'react-cytoscapejs'
import { useProject } from '../../contexts/ProjectContext'
import type { BackendDependencyItem, GraphNode } from '../../types'

export default function DependencyGraph() {
  const { activeProject, analysisData } = useProject()
  const cyRef = useRef<any>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [tabValue, setTabValue] = useState(0) // Default to Class Dependencies
  const [layoutName, setLayoutName] = useState<'cose' | 'breadthfirst'>('cose')

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const layoutOptions =
      layoutName === 'breadthfirst'
        ? {
            name: 'breadthfirst',
            directed: true,
            spacingFactor: 1.75,
            padding: 50,
            avoidOverlap: true,
            fit: true,
          }
        : {
            name: 'cose',
            animate: false,
            fit: true,
            padding: 50,
            nodeRepulsion: 9000,
            nodeOverlap: 32,
            idealEdgeLength: 140,
            edgeElasticity: 120,
            gravity: 40,
          }
    const runner = cy.layout(layoutOptions)
    runner.run()
    cy.fit(undefined, 50)
  }, [activeProject?.path, tabValue, layoutName])

  if (!activeProject || !analysisData) {
    return null
  }

  const { packageGraph, classGraph, circularDependencies, metadata } = analysisData.dependencyDetails

  const buildElements = (nodes: GraphNode[], edges: BackendDependencyItem[]) => {
    const elements: any[] = []
    const seenNodeIds = new Set<string>()
    nodes.forEach((node) => {
      seenNodeIds.add(node.id)
      elements.push({
        data: {
          id: node.id,
          label: node.label,
          fullName: node.id,
          type: node.type,
          healthLevel: node.healthLevel || 'GOOD',
        },
      })
    })
    edges.forEach((edge) => {
      if (!seenNodeIds.has(edge.source)) {
        seenNodeIds.add(edge.source)
        elements.push({
          data: {
            id: edge.source,
            label: edge.source.split('.').pop() || edge.source,
            fullName: edge.source,
            type: 'class',
            healthLevel: 'GOOD',
          },
        })
      }
      if (!seenNodeIds.has(edge.target)) {
        seenNodeIds.add(edge.target)
        elements.push({
          data: {
            id: edge.target,
            label: edge.target.split('.').pop() || edge.target,
            fullName: edge.target,
            type: 'class',
            healthLevel: 'GOOD',
          },
        })
      }
      elements.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
        },
      })
    })
    return elements
  }

  const classEdges = activeProject.dependencies.length > 0 ? activeProject.dependencies : classGraph.edges
  const classElements = buildElements(classGraph.nodes, classEdges)
  const packageElements = buildElements(packageGraph.nodes, packageGraph.edges)
  const currentElements = tabValue === 0 ? classElements : packageElements
  const currentGraphType = tabValue === 0 ? 'Class' : 'Package'

  const layout =
    layoutName === 'breadthfirst'
      ? {
          name: 'breadthfirst' as const,
          directed: true,
          spacingFactor: 1.75,
          padding: 50,
          avoidOverlap: true,
          fit: true,
        }
      : {
          name: 'cose' as const,
          animate: false,
          fit: true,
          padding: 50,
          nodeRepulsion: 9000,
          nodeOverlap: 32,
          idealEdgeLength: 140,
          edgeElasticity: 120,
          gravity: 40,
        }

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#6366F1',
        label: 'data(label)',
        color: '#F8FAFC',
        'font-size': '12px',
        'font-weight': 600,
        'text-valign': 'bottom',
        'text-margin-y': 8,
        'text-background-color': '#0F172A',
        'text-background-opacity': 0.85,
        'text-background-padding': '3px',
        width: '48px',
        height: '48px',
        shape: 'ellipse',
        'border-width': 2.5,
        'border-color': '#A5B4FC',
      },
    },
    {
      selector: 'node[healthLevel = "POOR"]',
      style: {
        'background-color': '#E11D48',
        'border-color': '#FDA4AF',
      },
    },
    {
      selector: 'node[healthLevel = "EXCELLENT"]',
      style: {
        'background-color': '#10B981',
        'border-color': '#6EE7B7',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2.5,
        'line-color': '#64748B',
        'target-arrow-color': '#64748B',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'edge[type = "cycle"]',
      style: {
        width: 3,
        'line-color': '#EF4444',
        'target-arrow-color': '#EF4444',
        'line-style': 'dashed',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': '#F59E0B',
        'border-width': 4,
        'border-color': '#FDE68A',
      },
    },
  ]

  const handleNodeTap = (event: any) => {
    setSelectedNode(event.target.data())
  }

  const handleFitView = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Dependency Graph
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Interactive class and package dependency topology for {activeProject?.name || 'Active Project'}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
              Graph Summary
            </Typography>
            <Box sx={{ mt: 2 }}>
              {[
                ['Class Nodes', classGraph.nodes.length, '#818CF8'],
                ['Package Nodes', packageGraph.nodes.length, '#60A5FA'],
                ['Total Edges', metadata.totalEdges, '#CBD5E1'],
                ['Cycles Detected', metadata.circularDependenciesCount, circularDependencies.length > 0 ? '#F43F5E' : '#10B981'],
              ].map(([label, val, color], idx) => (
                <Box
                  key={label as string}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 1.25,
                    borderBottom: idx < 3 ? '1px solid #334155' : 'none',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: color as string }}>
                    {val}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                Circular Dependencies
              </Typography>
              <Chip
                icon={circularDependencies.length > 0 ? <WarningIcon /> : <CheckCircleIcon />}
                label={circularDependencies.length > 0 ? `${circularDependencies.length} Cycles` : '0 Cycles'}
                color={circularDependencies.length > 0 ? 'error' : 'success'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            {circularDependencies.length > 0 ? (
              <List dense className="dark-scroll-container" sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {circularDependencies.map((dep, index) => (
                  <ListItem key={dep.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                            Cycle {index + 1}
                          </Typography>
                          <Chip label={dep.severity} size="small" color="error" />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#FCA5A5', display: 'block', mt: 0.5 }}>
                          {dep.path.join(' → ')}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mt: 2 }}>
                No circular dependencies detected. The dependency graph is a clean DAG.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
            Interactive Dependency Graph
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant={layoutName === 'cose' ? 'contained' : 'outlined'}
              startIcon={<LayoutIcon />}
              onClick={() => setLayoutName('cose')}
              sx={{
                textTransform: 'none',
                borderColor: '#334155',
                bgcolor: layoutName === 'cose' ? '#4F46E5' : 'transparent',
                color: '#F8FAFC',
              }}
            >
              COSE Force
            </Button>
            <Button
              size="small"
              variant={layoutName === 'breadthfirst' ? 'contained' : 'outlined'}
              startIcon={<LayoutIcon />}
              onClick={() => setLayoutName('breadthfirst')}
              sx={{
                textTransform: 'none',
                borderColor: '#334155',
                bgcolor: layoutName === 'breadthfirst' ? '#4F46E5' : 'transparent',
                color: '#F8FAFC',
              }}
            >
              Hierarchy
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FitIcon />}
              onClick={handleFitView}
              sx={{ textTransform: 'none', borderColor: '#334155', color: '#CBD5E1' }}
            >
              Fit View
            </Button>
          </Stack>
        </Box>

        <Tabs
          value={tabValue}
          onChange={(_e, v) => setTabValue(v)}
          sx={{
            mb: 2,
            '& .MuiTab-root': { fontWeight: 600, color: '#94A3B8' },
            '& .Mui-selected': { color: '#818CF8' },
            '& .MuiTabs-indicator': { backgroundColor: '#818CF8' },
          }}
        >
          <Tab label="Class Dependencies" />
          <Tab label="Package Dependencies" />
        </Tabs>

        <Box
          sx={{
            position: 'relative',
            height: 520,
            bgcolor: '#0F172A',
            border: '1px solid #334155',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <CytoscapeComponent
            key={`${activeProject.path}-${tabValue}-${layoutName}`}
            elements={currentElements}
            style={{ width: '100%', height: '100%' }}
            stylesheet={stylesheet}
            layout={layout}
            cy={(cy: any) => {
              cyRef.current = cy
              cy.removeAllListeners()
              cy.on('tap', 'node', handleNodeTap)
            }}
          />

          {/* Floating Graph Legend */}
          <Box
            data-testid="graph-legend"
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: 10,
              px: 2,
              py: 1.5,
              borderRadius: 2.5,
              bgcolor: 'rgba(15, 23, 42, 0.90)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #334155',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            }}
          >
            <Typography
              variant="caption"
              sx={{ display: 'block', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', mb: 1 }}
            >
              GRAPH LEGEND
            </Typography>
            <Stack spacing={0.85}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: '#6366F1',
                    border: '2px solid #A5B4FC',
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" sx={{ color: '#E2E8F0', fontWeight: 500 }}>
                  Node = {currentGraphType}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ width: 18, height: 2, bgcolor: '#64748B', flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: '#E2E8F0', fontWeight: 500 }}>
                  Edge = Dependency
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    width: 18,
                    height: 0,
                    borderTop: '2.5px dashed #EF4444',
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" sx={{ color: '#FCA5A5', fontWeight: 600 }}>
                  Red Edge = Cycle
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Paper>

      {selectedNode && (
        <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F8FAFC' }}>
            Selected {currentGraphType}: {selectedNode.label}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Chip label={`Type: ${selectedNode.type}`} size="small" sx={{ bgcolor: '#0F172A', color: '#E2E8F0' }} />
            <Chip label={`Full Name: ${selectedNode.fullName}`} size="small" sx={{ bgcolor: '#0F172A', color: '#93C5FD', fontFamily: 'monospace' }} />
            <Chip
              label={`Health: ${selectedNode.healthLevel || 'GOOD'}`}
              size="small"
              color={selectedNode.healthLevel === 'POOR' ? 'error' : selectedNode.healthLevel === 'EXCELLENT' ? 'success' : 'warning'}
            />
          </Box>
        </Paper>
      )}
    </Box>
  )
}
