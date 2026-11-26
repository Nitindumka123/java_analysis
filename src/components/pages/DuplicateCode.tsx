import { Box, Typography, Paper, Grid, Card, CardContent, Chip, Stack } from '@mui/material'
import { CheckCircle as CheckCircleIcon, ContentCopy as ContentCopyIcon, CompareArrows as CompareIcon } from '@mui/icons-material'
import { useProject } from '../../contexts/ProjectContext'

export default function DuplicateCode() {
  const { activeProject, analysisData } = useProject()

  if (!activeProject || !analysisData) {
    return null
  }

  const duplicates = Array.isArray(analysisData.duplicates) ? analysisData.duplicates : []
  const stats = analysisData.duplicateStats || {
    totalClones: duplicates.length,
    totalDuplicatedLines: duplicates.reduce((sum, d) => sum + d.lines, 0),
    duplicationPercentage: 0,
    affectedFiles: new Set(duplicates.flatMap((d) => [d.fileA, d.fileB])).size,
    potentialSavings: duplicates.reduce((sum, d) => sum + d.lines, 0),
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#F8FAFC' }}>
        Duplicate Code
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mb: 3, color: '#94A3B8' }}>
        AST method-body similarity detection and refactoring savings for {activeProject?.name || 'Active Project'}
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Duplicate Pairs
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: stats.totalClones > 0 ? '#F59E0B' : '#10B981' }}>
                {stats.totalClones}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Duplicated Lines
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#60A5FA' }}>
                {stats.totalDuplicatedLines}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Duplication Ratio
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#A78BFA' }}>
                {stats.duplicationPercentage.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                Lines Saved If Refactored
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#34D399' }}>
                {stats.potentialSavings} lines
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#1E293B', border: '1px solid #334155' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <ContentCopyIcon sx={{ color: '#60A5FA' }} />
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
            Detected Duplicate Method Pairs
          </Typography>
        </Box>

        {duplicates.length > 0 ? (
          <Box className="dark-scroll-container" sx={{ maxHeight: 420, overflowY: 'auto', pr: 0.75 }}>
            <Grid container spacing={2.5}>
              {duplicates.map((dup, index) => (
                <Grid item xs={12} md={6} key={`${dup.fileA}-${dup.methodA}-${dup.fileB}-${dup.methodB}-${index}`}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 2.5,
                      bgcolor: '#0F172A',
                      border: '1px solid #334155',
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                          Clone Pair #{index + 1}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={`${dup.similarity}% Similar`}
                            size="small"
                            sx={{
                              bgcolor: dup.similarity >= 95 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                              color: dup.similarity >= 95 ? '#FB7185' : '#FCD34D',
                              fontWeight: 700,
                            }}
                          />
                          <Chip
                            label={`${dup.lines} lines saved if refactored`}
                            size="small"
                            sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7', fontWeight: 600 }}
                          />
                        </Stack>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 160, p: 1.5, borderRadius: 2, bgcolor: '#1E293B', border: '1px solid #334155' }}>
                          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                            {dup.fileA}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#93C5FD', fontFamily: 'monospace', fontWeight: 600 }}>
                            {dup.methodA}
                          </Typography>
                        </Box>

                        <CompareIcon sx={{ color: '#64748B' }} />

                        <Box sx={{ flex: 1, minWidth: 160, p: 1.5, borderRadius: 2, bgcolor: '#1E293B', border: '1px solid #334155' }}>
                          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                            {dup.fileB}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#93C5FD', fontFamily: 'monospace', fontWeight: 600 }}>
                            {dup.methodB}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : (
          <Box
            data-testid="duplicates-empty-state"
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
              No duplicates found
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              No issues found. Your code is clean! Zero duplicate method blocks were identified.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
