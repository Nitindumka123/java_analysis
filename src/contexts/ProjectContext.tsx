import { createContext, useContext, useState, ReactNode } from 'react'
import type { AnalysisResponse } from '../types'

export type ProjectModel = AnalysisResponse
export type AnalysisStatus = 'IDLE' | 'ANALYZING' | 'ACTIVE'

interface ProjectContextType {
  activeProject: AnalysisResponse | null
  analysisStatus: AnalysisStatus
  analysisData: AnalysisResponse['analysis'] | null
  setAnalyzing: () => void
  setActiveProject: (project: AnalysisResponse) => void
  clearProject: () => void
  projectPath: string | null
  setAnalysisStatus: (status: AnalysisStatus) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

function loadSavedProject(): AnalysisResponse | null {
  try {
    const saved = localStorage.getItem('devscope_active_project')
    if (!saved) return null
    const parsed = JSON.parse(saved)
    if (parsed && parsed.metrics && parsed.analysis) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProjectState] = useState<AnalysisResponse | null>(loadSavedProject)
  const [analysisStatus, setAnalysisStatusState] = useState<AnalysisStatus>(activeProject ? 'ACTIVE' : 'IDLE')

  const setAnalyzing = () => {
    setAnalysisStatusState('ANALYZING')
  }

  const setActiveProject = (projectData: AnalysisResponse) => {
    const stored: AnalysisResponse = {
      ...projectData,
      id: projectData.id || Date.now().toString(),
      name: projectData.name || projectData.projectName,
      path: projectData.path || projectData.projectName,
    }
    setActiveProjectState(stored)
    setAnalysisStatusState('ACTIVE')
    try {
      localStorage.setItem('devscope_active_project', JSON.stringify(stored))
    } catch {
      // Ignore storage quota errors
    }
  }

  const clearProject = () => {
    setActiveProjectState(null)
    setAnalysisStatusState('IDLE')
    try {
      localStorage.removeItem('devscope_active_project')
      localStorage.clear()
    } catch {
      // Ignore storage errors
    }
  }

  const projectPath = activeProject?.path || null
  const analysisData = activeProject?.analysis || null

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        analysisStatus,
        analysisData,
        setAnalyzing,
        setActiveProject,
        clearProject,
        projectPath,
        setAnalysisStatus: setAnalysisStatusState,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}
