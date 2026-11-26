import { useState } from 'react'
import { Box, Typography, TextField, Paper, Grid, List, ListItem, ListItemButton, ListItemText, Collapse, IconButton, Chip } from '@mui/material'
import { ExpandMore, ChevronRight, Search } from '@mui/icons-material'
import { useProject } from '../../contexts/ProjectContext'

interface TreeNode {
  id: string
  name: string
  type: 'package' | 'class' | 'interface' | 'method'
  meta?: string
  children?: TreeNode[]
}

export default function ProjectExplorer() {
  const { activeProject, analysisData } = useProject()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  if (!activeProject || !analysisData) {
    return null
  }

  const buildTree = (): TreeNode[] => {
    const packageMap = new Map<string, TreeNode>()
    analysisData.structural.files.forEach((file) => {
      const pkg = file.packageName || 'default'
      if (!packageMap.has(pkg)) {
        packageMap.set(pkg, {
          id: `pkg-${pkg}`,
          name: pkg,
          type: 'package',
          children: [],
        })
      }
      const pkgNode = packageMap.get(pkg)!
      const classId = `class-${pkg}-${file.fileName}`
      const classNode: TreeNode = {
        id: classId,
        name: file.fileName,
        type: file.isInterface ? 'interface' : 'class',
        meta: `${file.linesOfCode} LOC`,
        children: file.methods.map((m, idx) => ({
          id: `method-${classId}-${idx}`,
          name: `${m.name}()`,
          type: 'method',
          meta: `CC: ${m.complexity} · ${m.lines} LOC`,
        })),
      }
      pkgNode.children!.push(classNode)
    })
    return Array.from(packageMap.values())
  }

  const treeData = buildTree()

  const toggleNode = (nodeId: string) => {
    const next = new Set(expandedNodes)
    if (next.has(nodeId)) next.delete(nodeId)
    else next.add(nodeId)
    setExpandedNodes(next)
  }

  const renderTree = (nodes: TreeNode[], level = 0) =>
    nodes.map((node) => {
      const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase())
      const filteredChildren = node.children?.filter((child) =>
        child.name.toLowerCase().includes(searchTerm.toLowerCase())
      )

      if (searchTerm && !matchesSearch && (!filteredChildren || filteredChildren.length === 0)) {
        return null
      }

      const hasChildren = Boolean(node.children && node.children.length > 0)
      const isExpanded = expandedNodes.has(node.id) || Boolean(searchTerm)

      return (
        <Box key={node.id}>
          <ListItem disablePadding sx={{ pl: level * 2 }}>
            <ListItemButton
              onClick={() => {
                setSelectedNode(node)
                if (hasChildren) toggleNode(node.id)
              }}
              selected={selectedNode?.id === node.id}
              sx={{
                borderRadius: 1.5,
                '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
              }}
            >
              {hasChildren && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleNode(node.id)
                  }}
                  sx={{ mr: 1, color: '#94A3B8' }}
                >
                  {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                </IconButton>
              )}
              <ListItemText
                primary={<Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 500 }}>{node.name}</Typography>}
                secondary={node.meta ? <Typography variant="caption" sx={{ color: '#94A3B8' }}>{node.meta}</Typography> : undefined}
              />
            </ListItemButton>
          </ListItem>
          {hasChildren && isExpanded && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ pl: 2 }}>{renderTree(filteredChildren || node.children || [], level + 1)}</Box>
            </Collapse>
          )}
        </Box>
      )
    })

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Project Explorer
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Navigate packages, classes, and methods in {activeProject?.name || 'Active Project'}
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search packages, classes, or methods..."
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: '#94A3B8' }} />,
                style: { color: '#F8FAFC', backgroundColor: '#0F172A' },
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>{renderTree(treeData)}</Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3, minHeight: 400, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            {selectedNode ? (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                  {selectedNode.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip label={`Type: ${selectedNode.type}`} size="small" color="primary" />
                  {selectedNode.meta && <Chip label={selectedNode.meta} size="small" variant="outlined" sx={{ color: '#CBD5E1', borderColor: '#475569' }} />}
                </Box>
                <Typography variant="body2" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                  Identifier: {selectedNode.id}
                </Typography>
                {selectedNode.children && selectedNode.children.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ color: '#E2E8F0', mb: 1 }}>
                      Contained Members ({selectedNode.children.length})
                    </Typography>
                    <List dense>
                      {selectedNode.children.map((child) => (
                        <ListItem key={child.id} sx={{ px: 0 }}>
                          <ListItemText
                            primary={<Typography variant="body2" sx={{ color: '#93C5FD', fontFamily: 'monospace' }}>{child.name}</Typography>}
                            secondary={<Typography variant="caption" sx={{ color: '#94A3B8' }}>{child.meta || child.type}</Typography>}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
                <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                  Select a package, class, or method from the tree to inspect details.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
