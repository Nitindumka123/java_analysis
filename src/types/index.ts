export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface SmellReferenceLink {
  title: string
  uri: string
}

export interface SmellGroundingResult {
  smellType: string
  summary: string
  references: SmellReferenceLink[]
}

export interface BackendSmellItem {
  id: string
  file: string
  issue: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  type: string
  className: string
  methodName: string
  lineNumber: number
  references?: SmellReferenceLink[]
  groundingSummary?: string
}

export interface BackendDependencyItem {
  id: string
  source: string
  target: string
  type: string
}

export interface MethodComplexityItem {
  methodName: string
  className: string
  fileName: string
  cyclomaticComplexity: number
  linesOfCode: number
  nestingDepth: number
  complexityLevel: 'Low' | 'Medium' | 'High' | 'Very High'
}

export interface GraphNode {
  id: string
  label: string
  type: 'package' | 'class'
  fanIn?: number
  fanOut?: number
  instability?: number
  abstractness?: number
  healthLevel?: string
}

export interface QualityChartPoint {
  name: string
  complexity: number
  maintainability: number
}

export interface DeadCodeItem {
  type: 'method' | 'field'
  name: string
  file: string
  line: number
}

export interface DuplicatePairItem {
  fileA: string
  methodA: string
  fileB: string
  methodB: string
  similarity: number
  lines: number
}

export interface ChangeImpactResult {
  target: string
  directDependents: string[]
  indirectDependents: string[]
  riskScore: number
  riskLevel: RiskLevel
  traversalResult: {
    traversalType: string
    maxDepth: number
    visitedNodes: number
    metadata: { analysisDurationMs: number }
    nodes: Array<{ id: string; label: string; role: 'target' | 'direct' | 'indirect' | 'other' }>
    edges: BackendDependencyItem[]
  }
}

export interface AnalysisResponse {
  id?: string
  name: string
  path: string
  projectName: string
  language?: string
  createdAt?: string
  metrics: {
    files: number
    packages: number
    classes: number
    methods: number
    linesOfCode: number
    complexity: number
  }
  smells: BackendSmellItem[]
  dependencies: BackendDependencyItem[]
  analysis: {
    riskLevel: RiskLevel
    overview: {
      totalFiles: number
      totalPackages: number
      totalClasses: number
      totalMethods: number
      linesOfCode: number
    }
    qualityChartData: QualityChartPoint[]
    structural: {
      metadata: {
        totalFiles: number
        totalPackages: number
        totalClasses: number
        totalMethods: number
        linesOfCode: number
      }
      files: Array<{
        fileName: string
        relativePath: string
        className: string
        packageName: string
        isInterface: boolean
        linesOfCode: number
        classes: Array<{ name: string }>
        methods: Array<{ name: string; complexity: number; lines: number; startLine: number; endLine: number }>
      }>
    }
    complexity: {
      complexityScore: number
      projectSummary: {
        averageCyclomaticComplexity: number
        maxComplexity: number
        totalMethods: number
        highComplexityMethods: number
      }
      riskAnalysis: {
        lowRisk: number
        mediumRisk: number
        highRisk: number
        veryHighRisk: number
        highRiskMethodCount: number
        complexMethodCount: number
        largeClassCount: number
      }
      methodComplexityScores: MethodComplexityItem[]
      methodComplexities: Array<{ methodName: string; className: string; complexityScore: number }>
    }
    maintainability: {
      projectMaintainability: {
        overallMaintainabilityScore: number
        maintainabilityLevel: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR'
        volumeScore: number
        complexityScore: number
        duplicationScore: number
        classMaintainabilities: Array<{ className: string; overallClassification: string }>
      }
      classMaintainabilityScores: Array<{
        className: string
        maintainabilityIndex: number
        maintainabilityLevel: string
      }>
    }
    codeSmells: {
      statistics: {
        totalSmells: number
        criticalSmells: number
        highSmells: number
        mediumSmells: number
        lowSmells: number
        longMethods: number
        longClasses: number
        duplicateCode: number
        featureEnvy: number
        godClasses: number
      }
      smells: BackendSmellItem[]
    }
    technicalDebt: {
      debtHours: number
      overallTechnicalDebtScore: number
      overallDebtLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      engineeringHealthScore: {
        healthScore: number
        healthLevel: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR'
        totalIssues: number
      }
      projectHealthSummary: {
        projectName: string
        overallHealthLevel: string
        totalClasses: number
        totalMethods: number
        totalPackages: number
      }
      debtCategories: Array<{
        category: string
        score: number
        debtScore: number
        hours: number
        severity: 'Low' | 'Medium' | 'High' | 'Critical'
      }>
      riskRankings: Array<{
        entityName: string
        riskScore: number
        riskType: string
      }>
      recommendations: Array<{
        title: string
        priority: 'Low' | 'Medium' | 'High' | 'Critical'
        impact: string
      }>
      improvementTasks: Array<{
        title: string
        effort: string
        category: string
      }>
    }
    dependencyDetails: {
      metadata: {
        totalNodes: number
        totalEdges: number
        circularDependenciesCount: number
      }
      packageGraph: {
        nodes: GraphNode[]
        edges: BackendDependencyItem[]
      }
      classGraph: {
        nodes: GraphNode[]
        edges: BackendDependencyItem[]
      }
      circularDependencies: Array<{
        id: string
        path: string[]
        severity: string
      }>
      packageMetrics: Array<{
        entityName: string
        fanIn: number
        fanOut: number
        instability: number
        distanceFromMainSequence: number
        layerViolations: number
      }>
      packageHealth: Array<{ entityName: string; healthLevel: string }>
      classMetrics: Array<{ entityName: string; fanIn: number; fanOut: number }>
      classHealth: Array<{ entityName: string; healthLevel: string }>
    }
    duplicates: DuplicatePairItem[]
    duplicateStats: {
      totalClones: number
      totalDuplicatedLines: number
      duplicationPercentage: number
      affectedFiles: number
      potentialSavings: number
    }
    deadCode: DeadCodeItem[]
    deadCodeStats: {
      totalDeadCode: number
      unusedMethods: number
      unusedFields: number
      filesAffected: number
    }
    git: {
      repositoryStatistics: {
        branch: string
        totalCommits: number
        totalFiles: number
        linesOfCode: number
        commitsPerDay: number
        activeDays: number
        avgCommitSize: number
        totalLinesAdded: number
        totalLinesDeleted: number
        churnRate: number
        modifiedFiles: number
      }
      contributors: Array<{ name: string; commitCount: number; linesContributed: number }>
      hotspots: Array<{ filePath: string; commitCount: number; churn: number }>
      commits: Array<{
        hash: string
        message: string
        author: string
        timestamp: string
        linesAdded: number
        linesDeleted: number
      }>
      stabilityMetrics: Array<{ filePath: string; stabilityScore: number; changeFrequency: string }>
    }
    impact: ChangeImpactResult
    performance: {
      statistics: {
        parsingDurationMs: number
        totalFilesScanned: number
        successfullyParsed: number
        failedFiles: number
      }
      cacheStats: {
        cacheHitRatio: number
        cacheHits: number
        cacheMisses: number
      }
    }
  }
}
