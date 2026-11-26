import PDFDocument from 'pdfkit'
import { writeToBuffer } from 'fast-csv'
import type { AnalysisResponse, BackendSmellItem } from '../src/types'

export type ReportFormat = 'pdf' | 'csv'

export interface ReportRequestPayload {
  projectData: AnalysisResponse
  format: ReportFormat
  reportType?: string
}

export function sanitizeReportFilename(projectName: string, extension: ReportFormat): string {
  const raw = (projectName || 'Project').trim()
  const sanitized = raw
    .replace(/[\r\n"\\/:*?<>|]+/g, '_')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._]+|[._]+$/g, '')
  const safeBase = sanitized.length > 0 ? sanitized.slice(0, 64) : 'Project'
  return `DevScope_Report_${safeBase}.${extension}`
}

export function validateReportPayload(body: unknown): ReportRequestPayload {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object containing analyzed project data and format.')
  }

  const record = body as Record<string, unknown>
  const candidateProject = (record.projectData && typeof record.projectData === 'object'
    ? record.projectData
    : record) as Partial<AnalysisResponse>

  if (
    !candidateProject ||
    typeof candidateProject !== 'object' ||
    !candidateProject.metrics ||
    typeof candidateProject.metrics.files !== 'number' ||
    typeof candidateProject.metrics.classes !== 'number' ||
    typeof candidateProject.metrics.methods !== 'number' ||
    typeof candidateProject.metrics.linesOfCode !== 'number' ||
    typeof candidateProject.metrics.complexity !== 'number'
  ) {
    throw new Error('Invalid or incomplete project analysis data. Please run code analysis before exporting.')
  }

  const rawFormat = String(record.format || 'pdf').trim().toLowerCase()
  if (rawFormat !== 'pdf' && rawFormat !== 'csv') {
    throw new Error(`Unsupported report format "${rawFormat}". Supported formats are "pdf" and "csv".`)
  }

  const reportType =
    typeof record.reportType === 'string' && record.reportType.trim().length > 0
      ? record.reportType.trim().slice(0, 64)
      : 'COMPLETE_ASSESSMENT'

  return {
    projectData: candidateProject as AnalysisResponse,
    format: rawFormat,
    reportType,
  }
}

export async function generatePdfReportBuffer(
  projectData: AnalysisResponse,
  reportType = 'COMPLETE_ASSESSMENT'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (err: Error) => reject(err))

    const projectName = projectData.projectName || projectData.name || 'Analyzed Project'
    const generatedAt = new Date().toISOString()
    const metrics = projectData.metrics
    const smells: BackendSmellItem[] = Array.isArray(projectData.smells) ? projectData.smells : []
    const riskLevel = projectData.analysis?.riskLevel || 'LOW'
    const debtHours = projectData.analysis?.technicalDebt?.debtHours ?? 0
    const maintainability =
      projectData.analysis?.maintainability?.projectMaintainability?.overallMaintainabilityScore ?? 100
    const circularDeps =
      projectData.analysis?.dependencyDetails?.metadata?.circularDependenciesCount ?? 0

    // Header Banner
    doc.rect(48, 48, doc.page.width - 96, 76).fill('#0F172A')
    doc
      .fillColor('#F8FAFC')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('DevScope Engineering Intelligence Report', 64, 64)
    doc
      .fillColor('#94A3B8')
      .font('Helvetica')
      .fontSize(10)
      .text(`Template: ${reportType}   |   Generated: ${generatedAt}`, 64, 92)

    let cursorY = 144

    // Project Metadata
    doc
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('Project Overview', 48, cursorY)
    cursorY += 20

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#334155')
      .text(`Project Name: ${projectName}`, 48, cursorY)
    cursorY += 15
    doc.text(`Project Path: ${projectData.path || 'N/A'}`, 48, cursorY)
    cursorY += 15
    doc.text(`Report Date: ${generatedAt.slice(0, 10)}`, 48, cursorY)
    cursorY += 15
    doc.text(`Overall Risk Level: ${riskLevel}`, 48, cursorY)
    cursorY += 26

    // Summary Metrics Grid
    doc
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('Summary Metrics', 48, cursorY)
    cursorY += 18

    const summaryRows: Array<[string, string, string, string]> = [
      ['Total Files', String(metrics.files), 'Complexity Score', `${metrics.complexity} / 100`],
      ['Total Classes', String(metrics.classes), 'Maintainability', `${Math.round(maintainability)} / 100`],
      ['Total Methods', String(metrics.methods), 'Technical Debt', `${debtHours} hrs`],
      ['Lines of Code (LOC)', String(metrics.linesOfCode), 'Code Smells', String(smells.length)],
      ['Packages', String(metrics.packages ?? 1), 'Circular Dependencies', String(circularDeps)],
    ]

    summaryRows.forEach(([labelA, valA, labelB, valB], idx) => {
      const rowY = cursorY + idx * 22
      doc.rect(48, rowY, doc.page.width - 96, 20).fill(idx % 2 === 0 ? '#F1F5F9' : '#FFFFFF')
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9.5).text(labelA, 56, rowY + 5)
      doc.fillColor('#0F172A').font('Helvetica').fontSize(9.5).text(valA, 190, rowY + 5)
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9.5).text(labelB, 300, rowY + 5)
      doc.fillColor('#0F172A').font('Helvetica').fontSize(9.5).text(valB, 440, rowY + 5)
    })

    cursorY += summaryRows.length * 22 + 24

    // Code Smells Table
    const drawSmellsTableHeader = (y: number): number => {
      doc.rect(48, y, doc.page.width - 96, 22).fill('#1E293B')
      doc.fillColor('#F8FAFC').font('Helvetica-Bold').fontSize(9.5)
      doc.text('File', 56, y + 6, { width: 110 })
      doc.text('Severity', 172, y + 6, { width: 64 })
      doc.text('Line', 240, y + 6, { width: 40 })
      doc.text('Issue', 284, y + 6, { width: doc.page.width - 340 })
      return y + 24
    }

    doc
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(`Code Smells (${smells.length})`, 48, cursorY)
    cursorY += 18

    if (smells.length === 0) {
      doc
        .fillColor('#059669')
        .font('Helvetica')
        .fontSize(10)
        .text('No code smells detected. This codebase meets clean-code thresholds.', 48, cursorY)
    } else {
      cursorY = drawSmellsTableHeader(cursorY)

      smells.forEach((smell, index) => {
        const issueText = smell.issue || smell.type || 'Code smell detected'
        const issueWidth = doc.page.width - 340
        const issueHeight = doc.heightOfString(issueText, { width: issueWidth, align: 'left' })
        const rowHeight = Math.max(22, Math.ceil(issueHeight) + 10)

        if (cursorY + rowHeight > doc.page.height - 64) {
          doc.addPage()
          cursorY = drawSmellsTableHeader(48)
        }

        doc.rect(48, cursorY, doc.page.width - 96, rowHeight).fill(index % 2 === 0 ? '#F8FAFC' : '#FFFFFF')
        doc.fillColor('#0F172A').font('Helvetica').fontSize(9)
        doc.text(smell.file || 'Unknown', 56, cursorY + 5, { width: 110 })
        doc
          .fillColor(
            smell.severity === 'Critical' || smell.severity === 'High'
              ? '#DC2626'
              : smell.severity === 'Medium'
                ? '#D97706'
                : '#2563EB'
          )
          .font('Helvetica-Bold')
          .text(smell.severity || 'Medium', 172, cursorY + 5, { width: 64 })
        doc.fillColor('#475569').font('Helvetica').text(String(smell.lineNumber ?? '-'), 240, cursorY + 5, {
          width: 40,
        })
        doc.fillColor('#1E293B').text(issueText, 284, cursorY + 5, { width: issueWidth })

        cursorY += rowHeight
      })
    }

    // Add footers to all pages
    const pageRange = doc.bufferedPageRange()
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i)
      doc
        .fillColor('#64748B')
        .font('Helvetica')
        .fontSize(8.5)
        .text(
          `DevScope Static Analysis Report  •  ${projectName}  •  Page ${i + 1} of ${pageRange.count}`,
          48,
          doc.page.height - 58,
          { align: 'center', width: doc.page.width - 96, lineBreak: false }
        )
    }

    doc.end()
  })
}

export async function generateCsvReportBuffer(
  projectData: AnalysisResponse,
  reportType = 'COMPLETE_ASSESSMENT'
): Promise<Buffer> {
  const projectName = projectData.projectName || projectData.name || 'Analyzed Project'
  const generatedAt = new Date().toISOString()
  const metrics = projectData.metrics
  const smells: BackendSmellItem[] = Array.isArray(projectData.smells) ? projectData.smells : []
  const riskLevel = projectData.analysis?.riskLevel || 'LOW'
  const debtHours = projectData.analysis?.technicalDebt?.debtHours ?? 0
  const maintainability =
    projectData.analysis?.maintainability?.projectMaintainability?.overallMaintainabilityScore ?? 100

  const rows: Array<Record<string, string | number>> = [
    {
      Section: 'SUMMARY_METRICS',
      ProjectName: projectName,
      ReportType: reportType,
      GeneratedDate: generatedAt,
      Files: metrics.files,
      Classes: metrics.classes,
      Methods: metrics.methods,
      LinesOfCode: metrics.linesOfCode,
      ComplexityScore: metrics.complexity,
      RiskLevel: riskLevel,
      TechnicalDebtHours: debtHours,
      MaintainabilityScore: Math.round(maintainability),
      TotalCodeSmells: smells.length,
      File: '',
      Issue: '',
      Severity: '',
      ClassName: '',
      MethodName: '',
      LineNumber: '',
    },
  ]

  smells.forEach((smell) => {
    rows.push({
      Section: 'CODE_SMELL',
      ProjectName: projectName,
      ReportType: reportType,
      GeneratedDate: generatedAt,
      Files: metrics.files,
      Classes: metrics.classes,
      Methods: metrics.methods,
      LinesOfCode: metrics.linesOfCode,
      ComplexityScore: metrics.complexity,
      RiskLevel: riskLevel,
      TechnicalDebtHours: debtHours,
      MaintainabilityScore: Math.round(maintainability),
      TotalCodeSmells: smells.length,
      File: smell.file || '',
      Issue: smell.issue || '',
      Severity: smell.severity || '',
      ClassName: smell.className || '',
      MethodName: smell.methodName || '',
      LineNumber: smell.lineNumber ?? '',
    })
  })

  return writeToBuffer(rows, { headers: true })
}
