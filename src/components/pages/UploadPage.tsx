import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Modal,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import FolderIcon from '@mui/icons-material/Folder'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CodeIcon from '@mui/icons-material/Code'
import BugReportIcon from '@mui/icons-material/BugReport'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CloseIcon from '@mui/icons-material/Close'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import toast from 'react-hot-toast'
import { useProject } from '../../contexts/ProjectContext'
import { apiService } from '../../services/api'

const inputFieldSx = {
  '& .MuiInputLabel-root': {
    color: '#94A3B8',
    fontSize: '0.9rem',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#818CF8',
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#020617',
    color: '#E2E8F0',
    borderRadius: '10px',
    fontSize: '0.95rem',
    '& fieldset': {
      borderColor: '#334155',
      transition: 'border-color 0.2s ease',
    },
    '&:hover fieldset': {
      borderColor: '#475569',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#6366F1',
      borderWidth: '1.5px',
    },
  },
  '& .MuiInputBase-input::placeholder': {
    color: '#64748B',
    opacity: 1,
  },
}

interface UploadItem {
  file: File
  relativePath: string
}

async function collectFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<UploadItem[]> {
  const results: UploadItem[] = []
  const items = dataTransfer.items

  if (items && items.length > 0) {
    const readEntry = async (entry: any, parentPath = ''): Promise<void> => {
      if (!entry) return
      if (entry.isFile) {
        await new Promise<void>((resolve) => {
          entry.file(
            (file: File) => {
              const rel = parentPath ? `${parentPath}/${file.name}` : file.name
              results.push({ file, relativePath: rel })
              resolve()
            },
            () => resolve()
          )
        })
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader()
        const readAllEntries = async (): Promise<any[]> => {
          const all: any[] = []
          while (true) {
            const batch: any[] = await new Promise((resolve) => {
              dirReader.readEntries(
                (entries: any[]) => resolve(entries || []),
                () => resolve([])
              )
            })
            if (!batch || batch.length === 0) break
            all.push(...batch)
          }
          return all
        }
        const children = await readAllEntries()
        const nextParent = parentPath ? `${parentPath}/${entry.name}` : entry.name
        for (const child of children) {
          await readEntry(child, nextParent)
        }
      }
    }

    const entries: any[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as any
      if (typeof item.webkitGetAsEntry === 'function') {
        const entry = item.webkitGetAsEntry()
        if (entry) entries.push(entry)
      }
    }

    if (entries.length > 0) {
      for (const entry of entries) {
        await readEntry(entry, '')
      }
      if (results.length > 0) {
        return results
      }
    }
  }

  const rawFiles = Array.from(dataTransfer.files || [])
  return rawFiles.map((file) => ({
    file,
    relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }))
}

export default function UploadPage() {
  const navigate = useNavigate()
  const { setActiveProject, analysisStatus, setAnalyzing, setAnalysisStatus } = useProject()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)

  const [projectName, setProjectName] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [selectedItems, setSelectedItems] = useState<UploadItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [errorModalOpen, setErrorModalOpen] = useState(false)

  const sampleProjects = [
    {
      id: 'clean',
      name: 'Clean Project',
      path: 'sample-projects/clean-project',
      desc: 'Well-structured Java baseline with zero code smells and low complexity.',
      accentColor: '#10B981',
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconBorder: 'rgba(16, 185, 129, 0.25)',
      icon: <CheckCircleIcon sx={{ color: '#10B981', fontSize: 22 }} />,
    },
    {
      id: 'complex',
      name: 'Complex Project',
      path: 'sample-projects/complex-project',
      desc: 'Multi-class codebase with high CC, dead code, duplicates, and impact chains.',
      accentColor: '#F59E0B',
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconBorder: 'rgba(245, 158, 11, 0.25)',
      icon: <WarningIcon sx={{ color: '#F59E0B', fontSize: 22 }} />,
    },
    {
      id: 'broken',
      name: 'Broken Project',
      path: 'sample-projects/broken-project',
      desc: 'Invalid Java syntax fixture verifying parser diagnostics and error recovery.',
      accentColor: '#F43F5E',
      iconBg: 'rgba(244, 63, 94, 0.12)',
      iconBorder: 'rgba(244, 63, 94, 0.25)',
      icon: <BugReportIcon sx={{ color: '#F43F5E', fontSize: 22 }} />,
    },
  ]

  const attachUploadItems = (items: UploadItem[]) => {
    const validItems = items.filter((item) => {
      const lower = item.file.name.toLowerCase()
      return lower.endsWith('.zip') || lower.endsWith('.java')
    })

    if (validItems.length === 0) {
      toast.error('Please select a valid .zip archive, .java file, or a folder containing .java files.')
      return
    }

    setSelectedItems(validItems)
    if (!projectName.trim()) {
      const firstRel = validItems[0].relativePath.replace(/\\/g, '/')
      if (firstRel.includes('/')) {
        setProjectName(firstRel.split('/')[0])
      } else {
        setProjectName(validItems[0].file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const items: UploadItem[] = Array.from(e.target.files).map((file) => ({
        file,
        relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      }))
      attachUploadItems(items)
    }
    e.target.value = ''
  }

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const items: UploadItem[] = Array.from(e.target.files).map((file) => ({
        file,
        relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      }))
      attachUploadItems(items)
    }
    e.target.value = ''
  }

  const handleDragEnter = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer) {
      const collected = await collectFilesFromDataTransfer(e.dataTransfer)
      if (collected.length > 0) {
        attachUploadItems(collected)
      }
    }
  }

  const handleAnalyze = async (name: string, path: string, uploadItems?: UploadItem[]) => {
    setAnalysisError(null)
    setErrorModalOpen(false)
    setAnalyzing()

    try {
      let result
      if (uploadItems && uploadItems.length > 0) {
        const formData = new FormData()
        for (const item of uploadItems) {
          formData.append('files', item.file)
          formData.append('relativePaths', item.relativePath)
        }
        if (name) {
          formData.append('projectName', name)
        }
        result = await apiService.uploadProject(formData, name)
      } else {
        result = await apiService.analyzeProject(path, name)
      }

      setActiveProject(result)
      toast.success(`Analyzed ${result.projectName || name} (${result.metrics.files} files)`)
      navigate('/dashboard')
    } catch (err: any) {
      setAnalysisStatus('IDLE')
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Static analysis failed.'
      setAnalysisError(backendMessage)
      setErrorModalOpen(true)
      toast.error(backendMessage)
    }
  }

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedItems.length === 0 && !projectPath.trim()) {
      toast.error('Please upload a .zip, .java file, project folder, or enter a local path.')
      return
    }
    const inferredUploadName =
      selectedItems.length > 0
        ? selectedItems[0].relativePath.includes('/')
          ? selectedItems[0].relativePath.split('/')[0]
          : selectedItems[0].file.name.replace(/\.[^/.]+$/, '')
        : ''
    const inferredPathName =
      projectPath
        .trim()
        .replace(/\\/g, '/')
        .split('/')
        .pop()
        ?.replace(/\.java$/i, '') || ''

    const name = projectName.trim() || inferredUploadName || inferredPathName || 'Project'
    handleAnalyze(name, projectPath.trim(), selectedItems.length > 0 ? selectedItems : undefined)
  }

  const handleSelectSample = (sample: (typeof sampleProjects)[0]) => {
    handleAnalyze(sample.name, sample.path)
  }

  const isAnalyzing = analysisStatus === 'ANALYZING'
  const canSubmit = Boolean(selectedItems.length > 0 || projectPath.trim())
  const totalSelectedBytes = selectedItems.reduce((sum, item) => sum + item.file.size, 0)

  const getSelectionSummaryLabel = () => {
    if (selectedItems.length === 0) return ''
    if (selectedItems.length === 1) {
      return selectedItems[0].file.name
    }
    const firstRel = selectedItems[0].relativePath.replace(/\\/g, '/')
    const folderPrefix = firstRel.includes('/') ? firstRel.split('/')[0] : 'Selected Files'
    return `${folderPrefix} (${selectedItems.length} Java files)`
  }

  return (
    <Box sx={{ maxWidth: 768, mx: 'auto', py: { xs: 2, sm: 4 }, px: { xs: 0, sm: 1 } }}>
      {analysisError && (
        <Alert
          severity="error"
          onClose={() => setAnalysisError(null)}
          sx={{
            mb: 3,
            borderRadius: 3,
            bgcolor: 'rgba(244, 63, 94, 0.12)',
            color: '#FECDD3',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            '& .MuiAlert-icon': { color: '#F43F5E' },
          }}
        >
          <AlertTitle sx={{ fontWeight: 700, color: '#FB7185' }}>Parser Error</AlertTitle>
          {analysisError}
        </Alert>
      )}

      {/* Unified Command Center Upload Card */}
      <Paper
        elevation={0}
        data-testid="upload-command-card"
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: '16px',
          backgroundColor: '#0F172A',
          backgroundImage: 'linear-gradient(180deg, rgba(30, 41, 59, 0.55) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid #1E293B',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          mb: 5,
        }}
      >
        {/* Card Header */}
        <Box sx={{ mb: 3.5 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#F8FAFC',
              letterSpacing: '-0.02em',
              mb: 0.75,
            }}
          >
            Analyze Codebase
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.95rem' }}>
            Upload a ZIP, single .java file, project folder, provide a local path, or select a sample project.
          </Typography>
        </Box>

        <form onSubmit={handleAnalyzeSubmit}>
          {/* Input Grouping */}
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. EnterpriseBackend"
              variant="outlined"
              sx={inputFieldSx}
            />

            <TextField
              fullWidth
              label="Local Project or File Path"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="e.g. sample-projects/complex-project or sample-projects/complex-project/src/GodClass.java"
              variant="outlined"
              sx={inputFieldSx}
              InputProps={{
                startAdornment: <FolderIcon sx={{ mr: 1.25, color: '#64748B', fontSize: 20 }} />,
              }}
            />
          </Stack>

          {/* Subtle Divider */}
          <Divider
            sx={{
              my: 3,
              '&::before, &::after': {
                borderColor: '#1E293B',
              },
              color: '#64748B',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            OR UPLOAD FILES / FOLDER
          </Divider>

          {/* Hidden Inputs for File (.zip, .java) and Directory (webkitdirectory) Selection */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.java"
            multiple
            hidden
            data-testid="file-upload-input"
            onChange={handleFileChange}
          />
          <input
            ref={folderInputRef}
            type="file"
            hidden
            multiple
            data-testid="folder-upload-input"
            onChange={handleFolderChange}
            {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          />

          {/* Unified Drag & Drop Zone */}
          <Box
            data-testid="zip-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: isDragging
                ? '#6366F1'
                : selectedItems.length > 0
                ? 'rgba(99, 102, 241, 0.55)'
                : '#334155',
              borderRadius: '12px',
              py: 4,
              px: 3,
              mb: 3,
              textAlign: 'center',
              backgroundColor: isDragging
                ? 'rgba(99, 102, 241, 0.12)'
                : 'rgba(2, 6, 23, 0.5)',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease, background-color 0.2s ease',
              '&:hover': {
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.06)',
              },
            }}
          >
            {selectedItems.length > 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, maxWidth: '100%' }}>
                <InsertDriveFileIcon sx={{ fontSize: 32, color: '#818CF8', flexShrink: 0 }} />
                <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    noWrap
                    sx={{ fontWeight: 600, color: '#F8FAFC', maxWidth: 420 }}
                  >
                    {getSelectionSummaryLabel()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    {(totalSelectedBytes / 1024).toFixed(1)} KB &middot; Ready for AST analysis
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label="Remove selected files"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedItems([])
                  }}
                  sx={{
                    ml: 1,
                    color: '#94A3B8',
                    '&:hover': { color: '#F8FAFC', bgcolor: 'rgba(148, 163, 184, 0.12)' },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '12px',
                    bgcolor: isDragging ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5,
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 28, color: '#818CF8' }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#E2E8F0', mb: 0.5 }}>
                  Drag & drop a .zip, .java file, or a project folder.
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.82rem', mb: 2 }}>
                  or use the buttons below to browse files or an unzipped project folder (max 50 MB)
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<InsertDriveFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      textTransform: 'none',
                      borderColor: '#334155',
                      color: '#E2E8F0',
                      borderRadius: '8px',
                      px: 2,
                      '&:hover': {
                        borderColor: '#6366F1',
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                      },
                    }}
                  >
                    Select .zip / .java File
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FolderOpenIcon />}
                    onClick={() => folderInputRef.current?.click()}
                    sx={{
                      textTransform: 'none',
                      borderColor: '#334155',
                      color: '#E2E8F0',
                      borderRadius: '8px',
                      px: 2,
                      '&:hover': {
                        borderColor: '#6366F1',
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                      },
                    }}
                  >
                    Select Project Folder
                  </Button>
                </Stack>
              </>
            )}
          </Box>

          {/* Full-Width Primary Action Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isAnalyzing || !canSubmit}
            startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
            sx={{
              py: 1.5,
              fontSize: '0.975rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              bgcolor: '#4F46E5',
              color: '#F8FAFC',
              boxShadow: canSubmit ? '0 8px 24px rgba(79, 70, 229, 0.35)' : 'none',
              '&:hover': {
                bgcolor: '#6366F1',
              },
              '&.Mui-disabled': {
                bgcolor: '#1E293B',
                color: '#64748B',
                border: '1px solid #334155',
              },
            }}
          >
            {isAnalyzing ? 'Analyzing AST...' : 'Analyze Project'}
          </Button>
        </form>
      </Paper>

      {/* Sample Project Selection Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: '#E2E8F0',
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CodeIcon sx={{ color: '#818CF8', fontSize: 20 }} />
          Or analyze a sample project:
        </Typography>

        <Grid container spacing={2.5}>
          {sampleProjects.map((sample) => (
            <Grid item xs={12} md={4} key={sample.id}>
              <Card
                elevation={0}
                onClick={() => handleSelectSample(sample)}
                sx={{
                  borderRadius: '14px',
                  bgcolor: '#0F172A',
                  border: '1px solid #1E293B',
                  transition: 'border-color 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    borderColor: '#6366F1',
                    bgcolor: 'rgba(30, 41, 59, 0.55)',
                    transform: 'translateY(-2px)',
                    '& .sample-action-arrow': {
                      transform: 'translateX(3px)',
                    },
                  },
                }}
              >
                <CardContent
                  sx={{
                    p: 2.5,
                    '&:last-child': { pb: 2.5 },
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          bgcolor: sample.iconBg,
                          border: `1px solid ${sample.iconBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {sample.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.98rem' }}>
                        {sample.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.84rem', lineHeight: 1.55, mb: 2.5 }}>
                      {sample.desc}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      pt: 1.5,
                      borderTop: '1px solid #1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        color: '#818CF8',
                      }}
                    >
                      Select Sample
                    </Typography>
                    <ArrowForwardIcon
                      className="sample-action-arrow"
                      sx={{
                        fontSize: 16,
                        color: '#818CF8',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Analyzing Modal */}
      <Modal open={isAnalyzing}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 440,
            maxWidth: '90vw',
            bgcolor: '#1E293B',
            borderRadius: 4,
            boxShadow: 24,
            p: 4,
            textAlign: 'center',
            outline: 'none',
            border: '1px solid #334155',
            color: '#F8FAFC',
          }}
        >
          <CircularProgress size={64} thickness={4} sx={{ mb: 3, color: '#6366F1' }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#F8FAFC' }}>
            Analyzing Codebase
          </Typography>
          <Typography variant="body1" sx={{ color: '#94A3B8' }}>
            Parsing Java source files via AST analyzer...
          </Typography>
        </Box>
      </Modal>

      {/* Error Modal */}
      <Modal open={errorModalOpen} onClose={() => setErrorModalOpen(false)}>
        <Box
          role="dialog"
          aria-labelledby="analysis-error-title"
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 480,
            maxWidth: '90vw',
            bgcolor: '#1E293B',
            borderRadius: 4,
            boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
            p: 4,
            outline: 'none',
            border: '1px solid rgba(244, 63, 94, 0.45)',
            color: '#F8FAFC',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                p: 1.25,
                borderRadius: 2,
                bgcolor: 'rgba(244, 63, 94, 0.16)',
                color: '#F43F5E',
                display: 'flex',
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 30 }} />
            </Box>
            <Box>
              <Typography id="analysis-error-title" variant="h6" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                Analysis Failed
              </Typography>
              <Typography variant="caption" sx={{ color: '#FDA4AF', fontWeight: 600 }}>
                Java Parser Syntax Exception
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#0F172A', border: '1px solid #334155', mb: 3 }}>
            <Typography variant="body2" sx={{ color: '#FECDD3', lineHeight: 1.6, fontWeight: 500 }}>
              {analysisError}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={() => setErrorModalOpen(false)}
              sx={{
                bgcolor: '#F43F5E',
                color: '#F8FAFC',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
                '&:hover': { bgcolor: '#E11D48' },
              }}
            >
              Dismiss
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  )
}
