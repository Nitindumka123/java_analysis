import axios from 'axios'
import type { AnalysisResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    if (response.data === null || response.data === undefined) {
      return { ...response, data: {} }
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
    }
    return Promise.reject(error)
  }
)

export const apiService = {
  // Real static Java analysis endpoint
  analyzeProject: async (projectPath: string, projectName?: string, targetClass?: string): Promise<AnalysisResponse> => {
    const response = await api.post<AnalysisResponse>('/analyze', { projectPath, projectName, targetClass })
    return response.data
  },

  // Upload and physically parse Java ZIP archive, single .java file, or unzipped project folder
  uploadProject: async (
    payload: FormData | File | File[],
    projectName?: string
  ): Promise<AnalysisResponse> => {
    let formData: FormData
    if (payload instanceof FormData) {
      formData = payload
      if (projectName && !formData.has('projectName')) {
        formData.append('projectName', projectName)
      }
    } else {
      formData = new FormData()
      const files = Array.isArray(payload) ? payload : [payload]
      for (const file of files) {
        formData.append('files', file)
        const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
        formData.append('relativePaths', relPath)
      }
      if (projectName) {
        formData.append('projectName', projectName)
      }
    }

    const response = await api.post<AnalysisResponse>('/projects/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  parseProject: async (projectPath: string): Promise<AnalysisResponse> => {
    const response = await api.post<AnalysisResponse>('/analyze', { projectPath })
    return response.data
  },

  getStructuralAnalysis: async (projectPath: string) => {
    const response = await api.post('/parser/analyze/structural', { projectPath })
    return response.data
  },

  getComplexityAnalysis: async (projectPath: string) => {
    const response = await api.post('/parser/analyze/complexity', { projectPath })
    return response.data
  },

  getMaintainabilityAnalysis: async (projectPath: string) => {
    const response = await api.post('/parser/analyze/maintainability', { projectPath })
    return response.data
  },

  getCodeSmells: async (projectPath: string) => {
    const response = await api.post('/parser/analyze/codesmells', { projectPath })
    return response.data
  },

  getDuplicateCode: async (projectPath: string) => {
    const response = await api.post('/parser/analyze/duplicates', { projectPath })
    return response.data
  },

  getDeadCode: async (projectPath: string) => {
    const response = await api.post('/parser/analyze/deadcode', { projectPath })
    return response.data
  },

  getDependencyGraph: async (projectPath: string) => {
    const response = await api.post('/parser/analyze/dependency-graph', { projectPath })
    return response.data
  },

  getGitAnalysis: async (projectPath: string) => {
    const response = await api.post('/parser/analyze/git', { projectPath })
    return response.data
  },

  getChangeImpact: async (projectPath: string, targetClass?: string) => {
    const response = await api.post('/parser/analyze/impact', { projectPath, targetClass })
    return response.data
  },

  analyzeImpact: async (projectPath: string, targetClass: string) => {
    const response = await api.post('/analyze/impact', { projectPath, targetClass })
    return response.data
  },

  getTechnicalDebt: async (projectPath: string) => {
    const response = await api.post('/parser/analyze/technical-debt', { projectPath })
    return response.data
  },

  getSettings: async () => {
    const response = await api.get('/settings')
    return response.data
  },

  updateSettings: async (settings: {
    darkMode: boolean
    notificationsEnabled: boolean
    autoRefreshData: boolean
    maxCyclomaticComplexity: number
    maxMethodLength: number
    maxClassSize: number
  }) => {
    const response = await api.post('/settings', settings)
    return response.data
  },

  downloadPdfReport: async (projectData: AnalysisResponse, reportType = 'COMPLETE_ASSESSMENT'): Promise<Blob> => {
    const response = await api.post(
      '/reports/generate',
      { projectData, format: 'pdf', reportType },
      { responseType: 'blob' }
    )
    return response.data
  },

  downloadCsvReport: async (projectData: AnalysisResponse, reportType = 'COMPLETE_ASSESSMENT'): Promise<Blob> => {
    const response = await api.post(
      '/reports/generate',
      { projectData, format: 'csv', reportType },
      { responseType: 'blob' }
    )
    return response.data
  },
}
