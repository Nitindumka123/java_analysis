import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import PublicLayout from './components/layout/PublicLayout'
import WorkspaceLayout from './components/layout/WorkspaceLayout'
import SkeletonLoader from './components/SkeletonLoader'
import ErrorBoundary from './components/ErrorBoundary'
import { useProject } from './contexts/ProjectContext'

const UploadPage = lazy(() => import('./components/pages/UploadPage'))
const MainDashboard = lazy(() => import('./components/pages/MainDashboard'))
const AnalyticsDashboard = lazy(() => import('./components/pages/AnalyticsDashboard'))
const ProjectExplorer = lazy(() => import('./components/pages/ProjectExplorer'))
const DependencyGraph = lazy(() => import('./components/pages/DependencyGraph'))
const CodeQuality = lazy(() => import('./components/pages/CodeQuality'))
const CodeSmells = lazy(() => import('./components/pages/CodeSmellsPage'))
const TechnicalDebt = lazy(() => import('./components/pages/TechnicalDebt'))
const Complexity = lazy(() => import('./components/pages/Complexity'))
const DuplicateCode = lazy(() => import('./components/pages/DuplicateCode'))
const DeadCode = lazy(() => import('./components/pages/DeadCode'))
const ChangeImpact = lazy(() => import('./components/pages/ChangeImpact'))
const Reports = lazy(() => import('./components/pages/Reports'))
const Settings = lazy(() => import('./components/pages/Settings'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { activeProject } = useProject()
  if (!activeProject) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function LayoutRouter() {
  const { analysisStatus } = useProject()
  // Layout switching based on state machine
  if (analysisStatus === 'ACTIVE') {
    return <WorkspaceLayout />
  }
  return <PublicLayout />
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<LayoutRouter />}>
          {/* Public / Idle Routes */}
          <Route
            path="/"
            element={
              <Suspense fallback={<SkeletonLoader />}>
                <UploadPage />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<SkeletonLoader />}>
                <Settings />
              </Suspense>
            }
          />

          {/* Protected Workspace Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <MainDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <AnalyticsDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/explorer"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <ProjectExplorer />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quality"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <CodeQuality />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dependencies"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <DependencyGraph />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/smells"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <CodeSmells />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/debt"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <TechnicalDebt />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/complexity"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <Complexity />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/duplicates"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <DuplicateCode />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dead-code"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <DeadCode />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/impact"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <ChangeImpact />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Suspense fallback={<SkeletonLoader />}>
                  <Reports />
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
