import express from 'express'
import cors from 'cors'
import multer from 'multer'
import AdmZip from 'adm-zip'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { createServer as createViteServer } from 'vite'
import {
  analyzeJavaProject,
  DEFAULT_ANALYSIS_THRESHOLDS,
  JavaSyntaxError,
  updateAnalysisSettings,
} from './server/javaAnalyzer'
import {
  ProjectNotFoundError,
  SecurityError,
  validateZipEntries,
} from './server/security'
import {
  generateCsvReportBuffer,
  generatePdfReportBuffer,
  sanitizeReportFilename,
  validateReportPayload,
} from './server/reportGenerator'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3000

// Trust first reverse-proxy hop for accurate client IP rate limiting
app.set('trust proxy', 1)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const uploadsDir = path.resolve(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max archive/file size
    files: 2000,
  },
})

// Rate limiter for expensive AST analysis & archive upload endpoints (10 req/min/IP)
const analysisRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many analysis requests from this IP. Please wait 1 minute before retrying.',
  },
})

let currentUser = { id: '1', username: 'admin', email: 'admin@devscope.io', role: 'ADMIN' }

let settings = {
  darkMode: true,
  notificationsEnabled: true,
  autoRefreshData: false,
  maxCyclomaticComplexity: DEFAULT_ANALYSIS_THRESHOLDS.maxCyclomaticComplexity,
  maxMethodLength: DEFAULT_ANALYSIS_THRESHOLDS.maxMethodLength,
  maxClassSize: DEFAULT_ANALYSIS_THRESHOLDS.maxClassSize,
}

function getActiveThresholds() {
  return {
    maxCyclomaticComplexity: settings.maxCyclomaticComplexity,
    maxMethodLength: settings.maxMethodLength,
    maxClassSize: settings.maxClassSize,
  }
}

function handleAnalysisError(err: unknown, res: express.Response, fallbackMessage: string) {
  if (err instanceof SecurityError) {
    return res.status(403).json({
      error: 'FORBIDDEN_PATH',
      message: err.message,
    })
  }
  if (err instanceof JavaSyntaxError) {
    return res.status(400).json({
      error: 'JAVA_SYNTAX_ERROR',
      message: err.message,
      file: err.file,
      line: err.line,
      column: err.column,
    })
  }
  if (err instanceof ProjectNotFoundError) {
    return res.status(400).json({
      error: 'PROJECT_NOT_FOUND',
      message: err.message,
    })
  }
  return res.status(500).json({
    error: 'ANALYSIS_ERROR',
    message: err instanceof Error ? err.message : fallbackMessage,
  })
}

// Auth Endpoints
app.post('/api/auth/login', (_req, res) => {
  res.json({
    token: 'devscope-session-token',
    user: currentUser,
  })
})

app.post('/api/auth/register', (req, res) => {
  const { username, email } = req.body || {}
  currentUser = {
    id: Date.now().toString(),
    username: typeof username === 'string' && username.trim() ? username.trim() : 'user',
    email: typeof email === 'string' && email.trim() ? email.trim() : 'user@devscope.io',
    role: 'USER',
  }
  res.json({
    token: 'devscope-session-token',
    user: currentUser,
  })
})

app.get('/api/auth/me', (_req, res) => {
  res.json(currentUser)
})

// Real Static Code Analysis Endpoint (Protected by Rate Limiter + Path Traversal Guard)
app.post('/api/analyze', analysisRateLimiter, (req, res) => {
  try {
    const projectPath = String(req.body?.projectPath || '')
    const targetClass = typeof req.body?.targetClass === 'string' ? req.body.targetClass : undefined
    const projectName = typeof req.body?.projectName === 'string' ? req.body.projectName : undefined
    const result = analyzeJavaProject(projectPath, __dirname, projectName, targetClass, getActiveThresholds())
    return res.json(result)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Unexpected analysis error')
  }
})

// Real Reverse-Graph BFS Change Impact Endpoint
app.post('/api/analyze/impact', (req, res) => {
  try {
    const projectPath = String(req.body?.projectPath || '')
    const targetClass = typeof req.body?.targetClass === 'string' ? req.body.targetClass.trim() : ''
    if (!targetClass) {
      return res.status(400).json({
        error: 'INVALID_TARGET_CLASS',
        message: 'targetClass is required for change impact analysis.',
      })
    }
    const result = analyzeJavaProject(projectPath, __dirname, undefined, targetClass, getActiveThresholds())
    return res.json(result.analysis.impact)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to compute change impact.')
  }
})

// Dynamic Upload & Path Analysis (.zip archives, .java files, unzipped folders, or local paths)
app.post('/api/projects/upload', analysisRateLimiter, upload.array('files'), (req, res) => {
  const uploadedFiles = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : []
  const rawProjectPath = typeof req.body?.projectPath === 'string' ? req.body.projectPath.trim() : ''
  const rawRelativePaths = req.body?.relativePaths
  const relativePaths: string[] = Array.isArray(rawRelativePaths)
    ? rawRelativePaths.map(String)
    : typeof rawRelativePaths === 'string'
    ? [rawRelativePaths]
    : []

  const extractDir = path.join(uploadsDir, `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

  try {
    if (uploadedFiles.length === 0 && !rawProjectPath) {
      return res.status(400).json({
        error: 'NO_INPUT',
        message: 'Please upload a .zip archive, .java file(s), a project folder, or provide a local path.',
      })
    }

    // Scenario A: User provided a local projectPath (folder or single .java file) with no uploaded files
    if (uploadedFiles.length === 0 && rawProjectPath) {
      const requestedName =
        typeof req.body?.projectName === 'string' && req.body.projectName.trim()
          ? req.body.projectName.trim()
          : undefined
      const result = analyzeJavaProject(rawProjectPath, __dirname, requestedName, undefined, getActiveThresholds())
      return res.json(result)
    }

    // Scenario B: Uploaded files contain a .zip archive
    const zipFile = uploadedFiles.find((f) => f.originalname.toLowerCase().endsWith('.zip'))
    if (zipFile) {
      const projectName =
        (typeof req.body?.projectName === 'string' && req.body.projectName.trim()) ||
        zipFile.originalname.replace(/\.zip$/i, '') ||
        'Uploaded Project'

      const zip = new AdmZip(zipFile.path)
      validateZipEntries(zip, extractDir)
      fs.mkdirSync(extractDir, { recursive: true })
      zip.extractAllTo(extractDir, true)
      const relativeExtractPath = path.relative(__dirname, extractDir).split(path.sep).join(path.sep)
      const result = analyzeJavaProject(relativeExtractPath, __dirname, projectName, undefined, getActiveThresholds())
      return res.json(result)
    }

    // Scenario C: Uploaded files contain .java files (single .java file or unzipped directory of files)
    const javaEntries = uploadedFiles
      .map((file, index) => ({
        file,
        relPath: relativePaths[index] || file.originalname,
      }))
      .filter((item) => item.file.originalname.toLowerCase().endsWith('.java') || item.relPath.toLowerCase().endsWith('.java'))

    if (javaEntries.length === 0) {
      return res.status(400).json({
        error: 'NO_JAVA_FILES',
        message: 'No valid .java or .zip files were found in the upload.',
      })
    }

    fs.mkdirSync(extractDir, { recursive: true })
    const resolvedExtractDir = path.resolve(extractDir)
    const resolvedExtractWithSep = resolvedExtractDir.endsWith(path.sep)
      ? resolvedExtractDir
      : `${resolvedExtractDir}${path.sep}`

    for (const { file, relPath } of javaEntries) {
      const safeRelative = relPath
        .replace(/\\/g, '/')
        .split('/')
        .filter((seg) => seg && seg !== '.' && seg !== '..')
        .join(path.sep)

      const destPath = path.resolve(resolvedExtractDir, safeRelative || path.basename(file.originalname))
      const destCmp = process.platform === 'win32' ? destPath.toLowerCase() : destPath
      const baseCmp = process.platform === 'win32' ? resolvedExtractWithSep.toLowerCase() : resolvedExtractWithSep

      if (!destCmp.startsWith(baseCmp)) {
        throw new SecurityError(`Forbidden: invalid relative file path "${relPath}".`)
      }

      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      fs.copyFileSync(file.path, destPath)
    }

    const firstRelParts = (relativePaths[0] || '').replace(/\\/g, '/').split('/').filter(Boolean)
    const inferredFolderName =
      firstRelParts.length > 1
        ? firstRelParts[0]
        : javaEntries[0].file.originalname.replace(/\.java$/i, '')

    const projectName =
      (typeof req.body?.projectName === 'string' && req.body.projectName.trim()) ||
      inferredFolderName ||
      'Uploaded Java Project'

    const relativeExtractPath = path.relative(__dirname, extractDir).split(path.sep).join(path.sep)
    const result = analyzeJavaProject(relativeExtractPath, __dirname, projectName, undefined, getActiveThresholds())
    return res.json(result)
  } catch (err: unknown) {
    if (err instanceof SecurityError) {
      return res.status(403).json({
        error: 'FORBIDDEN_ARCHIVE_PATH',
        message: err.message,
      })
    }
    if (err instanceof JavaSyntaxError) {
      return res.status(400).json({
        error: 'JAVA_SYNTAX_ERROR',
        message: err.message,
        file: err.file,
        line: err.line,
        column: err.column,
      })
    }
    if (err instanceof ProjectNotFoundError) {
      return res.status(400).json({
        error: 'PROJECT_NOT_FOUND',
        message: err.message,
      })
    }
    return res.status(400).json({
      error: 'UPLOAD_ANALYSIS_FAILED',
      message: err instanceof Error ? err.message : 'Failed to extract or parse uploaded files.',
    })
  } finally {
    for (const file of uploadedFiles) {
      try {
        fs.rmSync(file.path, { force: true })
      } catch {
        // Ignore temp file cleanup errors
      }
    }
  }
})

// Parser sub-endpoints backed by real physical AST analysis
app.post('/api/parser/analyze', analysisRateLimiter, (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze project')
  }
})

app.post('/api/parser/analyze/structural', (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result.analysis.structural)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze structure')
  }
})

app.post('/api/parser/analyze/complexity', (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result.analysis.complexity)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze complexity')
  }
})

app.post('/api/parser/analyze/maintainability', (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result.analysis.maintainability)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze maintainability')
  }
})

app.post('/api/parser/analyze/codesmells', (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result.analysis.codeSmells)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze code smells')
  }
})

app.post('/api/parser/analyze/duplicates', (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result.analysis.duplicates)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze duplicates')
  }
})

app.post('/api/parser/analyze/deadcode', (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result.analysis.deadCode)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze dead code')
  }
})

app.post('/api/parser/analyze/dependency-graph', (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result.analysis.dependencyDetails)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze dependencies')
  }
})

app.post('/api/parser/analyze/git', (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result.analysis.git)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze git history')
  }
})

app.post('/api/parser/analyze/impact', (req, res) => {
  try {
    const targetClass = typeof req.body?.targetClass === 'string' ? req.body.targetClass : undefined
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, targetClass, getActiveThresholds())
    return res.json(result.analysis.impact)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze change impact')
  }
})

app.post('/api/parser/analyze/technical-debt', (req, res) => {
  try {
    const result = analyzeJavaProject(String(req.body?.projectPath || ''), __dirname, undefined, undefined, getActiveThresholds())
    return res.json(result.analysis.technicalDebt)
  } catch (err: unknown) {
    return handleAnalysisError(err, res, 'Failed to analyze technical debt')
  }
})

// Physical PDF & CSV Report Generation Endpoint
app.post('/api/reports/generate', async (req, res) => {
  try {
    const { projectData, format, reportType } = validateReportPayload({
      ...(req.body && typeof req.body === 'object' ? req.body : {}),
      format: req.body?.format ?? req.query?.format,
    })

    const projectName = projectData.projectName || projectData.name || 'Project'
    const filename = sanitizeReportFilename(projectName, format)

    if (format === 'pdf') {
      const pdfBuffer = await generatePdfReportBuffer(projectData, reportType)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', String(pdfBuffer.length))
      return res.status(200).send(pdfBuffer)
    }

    const csvBuffer = await generateCsvReportBuffer(projectData, reportType)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', String(csvBuffer.length))
    return res.status(200).send(csvBuffer)
  } catch (err: unknown) {
    return res.status(400).json({
      error: 'REPORT_GENERATION_FAILED',
      message: err instanceof Error ? err.message : 'Failed to generate report.',
    })
  }
})

function handleUpdateSettings(req: express.Request, res: express.Response) {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (typeof body.darkMode === 'boolean') settings.darkMode = body.darkMode
  if (typeof body.notificationsEnabled === 'boolean') {
    settings.notificationsEnabled = body.notificationsEnabled
  }
  if (typeof body.autoRefreshData === 'boolean') settings.autoRefreshData = body.autoRefreshData
  if (typeof body.maxCyclomaticComplexity === 'number' && Number.isFinite(body.maxCyclomaticComplexity)) {
    settings.maxCyclomaticComplexity = Math.max(1, Math.min(50, Math.round(body.maxCyclomaticComplexity)))
  }
  if (typeof body.maxMethodLength === 'number' && Number.isFinite(body.maxMethodLength)) {
    settings.maxMethodLength = Math.max(10, Math.min(250, Math.round(body.maxMethodLength)))
  }
  if (typeof body.maxClassSize === 'number' && Number.isFinite(body.maxClassSize)) {
    settings.maxClassSize = Math.max(50, Math.min(2000, Math.round(body.maxClassSize)))
  }
  updateAnalysisSettings({
    maxCyclomaticComplexity: settings.maxCyclomaticComplexity,
    maxMethodLength: settings.maxMethodLength,
    maxClassSize: settings.maxClassSize,
  })
  return res.json({ success: true, settings })
}

app.get('/api/settings', (_req, res) => {
  res.json(settings)
})

app.post('/api/settings', handleUpdateSettings)
app.put('/api/settings', handleUpdateSettings)

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')))
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'))
  })
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
  })
  app.use(vite.middlewares)
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DevScope platform running on http://0.0.0.0:${PORT}`)
})
