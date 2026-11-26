import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
} from '@mui/material'
import { CheckCircle as CheckCircleIcon, CodeOff as CodeOffIcon } from '@mui/icons-material'
import { useProject } from '../../contexts/ProjectContext'

export default function DeadCode() {
  const { activeProject, analysisData } = useProject()

  if (!activeProject || !analysisData) {
    return null
  }

  const deadCode = Array.isArray(analysisData.deadCode) ? analysisData.deadCode : []
  const stats = analysisData.deadCodeStats || {
    totalDeadCode: deadCode.length,
    unusedMethods: deadCode.filter((d) => d.type === 'method').length,
    unusedFields: deadCode.filter((d) => d.type === 'field').length,
    filesAffected: new Set(deadCode.map((d) => d.file)).size,
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Dead Code
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        Unreferenced private methods and fields detected via AST inspection in {activeProject?.name || 'Active Project'}
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Total Dead Code Items
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: stats.totalDeadCode > 0 ? '#F59E0B' : '#10B981' }}>
                {stats.totalDeadCode}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Unused Private Methods
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#60A5FA' }}>
                {stats.unusedMethods}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Unused Private Fields
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#A78BFA' }}>
                {stats.unusedFields}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Files Affected
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#F8FAFC' }}>
                {stats.filesAffected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <CodeOffIcon sx={{ color: '#F59E0B' }} />
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
            Detected Dead Code
          </Typography>
        </Box>

        {deadCode.length > 0 ? (
          <TableContainer
            className="dark-scroll-container"
            sx={{ maxHeight: 380, overflowY: 'auto', bgcolor: '#0F172A', borderRadius: 2, border: '1px solid #334155' }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#0F172A', borderBottom: '1px solid #334155', color: '#94A3B8', fontWeight: 700 } }}>
                  <TableCell>Type</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell align="right">Line</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deadCode.map((item, idx) => (
                  <TableRow
                    key={`${item.file}-${item.line}-${item.name}-${idx}`}
                    hover
                    sx={{
                      '& td': { borderBottom: '1px solid #1E293B', color: '#E2E8F0' },
                      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.06)' },
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={item.type.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: item.type === 'method' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(167, 139, 250, 0.2)',
                          color: item.type === 'method' ? '#FBBF24' : '#C4B5FD',
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#93C5FD !important', fontWeight: 600 }}>
                      {item.name}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{item.file}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {item.line}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box
            data-testid="deadcode-empty-state"
            sx={{
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
              No dead code found
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              No issues found. Your code is clean! All private methods and fields are actively referenced.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
