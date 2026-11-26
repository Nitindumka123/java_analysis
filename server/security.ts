import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'

export class ProjectNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectNotFoundError'
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecurityError'
  }
}

const RESTRICTED_ROOT_SEGMENTS = new Set(['.git', 'node_modules', '.env'])

const WINDOWS_DRIVE_OR_UNC_REGEX = /^(?:[a-zA-Z]:[\\/]|\\\\[^\\]+\\[^\\]+)/
const WINDOWS_SYSTEM_PATH_REGEX =
  /^[a-zA-Z]:\\(?:windows|program files|program files \(x86\)|programdata|system volume information)(?:\\|$)/i
const POSIX_SYSTEM_PREFIXES = ['/etc', '/proc', '/sys', '/root', '/bin', '/sbin', '/usr', '/var', '/dev', '/boot']

function normalizeForComparison(p: string): string {
  return process.platform === 'win32' ? path.win32.normalize(p).toLowerCase() : path.normalize(p)
}

function hasRestrictedSegment(segments: string[]): string | null {
  for (const segment of segments) {
    if (segment && RESTRICTED_ROOT_SEGMENTS.has(segment.toLowerCase())) {
      return segment
    }
  }
  return null
}

export function validatePath(inputPath: string, workspaceRoot: string): {
  candidate: string
  isRelativeToWorkspace: boolean
  normalizedRoot: string
} {
  const trimmed = (inputPath || '').trim()
  if (!trimmed) {
    throw new ProjectNotFoundError('Project path is required.')
  }

  if (trimmed.includes('\0')) {
    throw new SecurityError('Forbidden: invalid null byte detected in project path.')
  }

  const normalizedRoot = path.resolve(path.normalize(workspaceRoot))
  const isWinAbs = WINDOWS_DRIVE_OR_UNC_REGEX.test(trimmed)
  const isPosixAbs = !isWinAbs && trimmed.startsWith('/')

  if (isWinAbs) {
    const rawSegments = trimmed.split(/[\\/]+/)
    if (rawSegments.includes('..')) {
      throw new SecurityError('Forbidden: path traversal segments ("..") are not allowed in absolute paths.')
    }

    const normalizedWin = path.win32.normalize(trimmed)
    if (WINDOWS_SYSTEM_PATH_REGEX.test(normalizedWin)) {
      throw new SecurityError(`Forbidden: access to Windows system directory "${normalizedWin}" is not allowed.`)
    }

    const restricted = hasRestrictedSegment(normalizedWin.split(path.win32.sep))
    if (restricted) {
      throw new SecurityError(`Forbidden: access to restricted directory "${restricted}" is not allowed.`)
    }

    if (process.platform !== 'win32') {
      throw new ProjectNotFoundError(`Project directory not found: ${normalizedWin}`)
    }

    const candidate = path.win32.resolve(normalizedWin)
    return { candidate, isRelativeToWorkspace: false, normalizedRoot }
  }

  if (isPosixAbs) {
    const rawSegments = trimmed.split(/[\\/]+/)
    if (rawSegments.includes('..')) {
      throw new SecurityError('Forbidden: path traversal segments ("..") are not allowed in absolute paths.')
    }

    const candidate = path.resolve(path.normalize(trimmed))
    const lowerPosix = candidate.replace(/\\/g, '/').toLowerCase()
    for (const blocked of POSIX_SYSTEM_PREFIXES) {
      if (lowerPosix === blocked || lowerPosix.startsWith(`${blocked}/`)) {
        throw new SecurityError(`Forbidden: access to system directory "${blocked}" is not allowed.`)
      }
    }

    const restricted = hasRestrictedSegment(candidate.split(/[\\/]+/))
    if (restricted) {
      throw new SecurityError(`Forbidden: access to restricted directory "${restricted}" is not allowed.`)
    }

    return { candidate, isRelativeToWorkspace: false, normalizedRoot }
  }

  const platformRelative = path.normalize(trimmed.replace(/[\\/]+/g, path.sep))
  const candidate = path.resolve(normalizedRoot, platformRelative)

  const rootCmp = normalizeForComparison(normalizedRoot)
  const rootWithSepCmp = rootCmp.endsWith(path.sep) ? rootCmp : `${rootCmp}${path.sep}`
  const candidateCmp = normalizeForComparison(candidate)

  const isInsideWorkspace = candidateCmp === rootCmp || candidateCmp.startsWith(rootWithSepCmp)
  if (!isInsideWorkspace) {
    throw new SecurityError(
      'Forbidden: path traversal detected. Project path must resolve strictly inside the allowed workspace directory.'
    )
  }

  const relativeFromRoot = path.relative(normalizedRoot, candidate)
  const restricted = hasRestrictedSegment(relativeFromRoot.split(path.sep))
  if (restricted) {
    throw new SecurityError(`Forbidden: access to restricted directory "${restricted}" is not allowed.`)
  }

  return { candidate, isRelativeToWorkspace: true, normalizedRoot }
}

export function resolveProjectRoot(inputPath: string, workspaceRoot: string): string {
  const { candidate, isRelativeToWorkspace, normalizedRoot } = validatePath(inputPath, workspaceRoot)

  if (!fs.existsSync(candidate)) {
    throw new ProjectNotFoundError(`Project directory not found: ${inputPath.trim()}`)
  }

  const realCandidate = fs.realpathSync(candidate)

  if (isRelativeToWorkspace) {
    const realRoot = fs.realpathSync(normalizedRoot)
    const realRootCmp = normalizeForComparison(realRoot)
    const realRootWithSepCmp = realRootCmp.endsWith(path.sep) ? realRootCmp : `${realRootCmp}${path.sep}`
    const realCandidateCmp = normalizeForComparison(realCandidate)

    if (realCandidateCmp !== realRootCmp && !realCandidateCmp.startsWith(realRootWithSepCmp)) {
      throw new SecurityError(
        'Forbidden: symbolic link resolves outside the allowed workspace directory.'
      )
    }
  } else if (process.platform === 'win32') {
    const normalizedRealWin = path.win32.normalize(realCandidate)
    if (WINDOWS_SYSTEM_PATH_REGEX.test(normalizedRealWin)) {
      throw new SecurityError(`Forbidden: symbolic link resolves to restricted Windows directory.`)
    }
  } else {
    const lowerReal = realCandidate.replace(/\\/g, '/').toLowerCase()
    for (const blocked of POSIX_SYSTEM_PREFIXES) {
      if (lowerReal === blocked || lowerReal.startsWith(`${blocked}/`)) {
        throw new SecurityError(`Forbidden: symbolic link resolves to restricted system directory "${blocked}".`)
      }
    }
  }

  const stat = fs.statSync(realCandidate)
  if (!stat.isDirectory() && !(stat.isFile() && realCandidate.toLowerCase().endsWith('.java'))) {
    throw new ProjectNotFoundError(
      `Expected a project directory or .java source file, got: ${inputPath.trim()}`
    )
  }

  return realCandidate
}

export function validateZipEntries(zip: AdmZip, targetDir: string) {
  const resolvedTarget = path.resolve(path.normalize(targetDir))
  const targetWithSep = resolvedTarget.endsWith(path.sep)
    ? resolvedTarget
    : `${resolvedTarget}${path.sep}`
  const targetCmp = process.platform === 'win32' ? resolvedTarget.toLowerCase() : resolvedTarget
  const targetWithSepCmp = process.platform === 'win32' ? targetWithSep.toLowerCase() : targetWithSep

  for (const entry of zip.getEntries()) {
    const normalizedEntry = entry.entryName.replace(/[\\/]+/g, path.sep)
    const destination = path.resolve(path.join(resolvedTarget, normalizedEntry))
    const destCmp = process.platform === 'win32' ? destination.toLowerCase() : destination
    if (destCmp !== targetCmp && !destCmp.startsWith(targetWithSepCmp)) {
      throw new SecurityError(
        `Forbidden: ZIP archive contains unsafe entry path "${entry.entryName}".`
      )
    }
  }
}
