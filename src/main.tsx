import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeProvider'
import { ToastProvider } from './context/ToastProvider'
import { AuthProvider } from './context/AuthProvider'
import { WorkspaceProvider } from './context/WorkspaceProvider'
import { UIProvider } from './context/UIProvider'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { AppRoutes } from './App'
import { TaskPanel } from './components/tasks/TaskPanel'
import { CommandPalette } from './components/layout/CommandPalette'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <UIProvider>
                <WorkspaceProvider>
                  <AppRoutes />
                  <TaskPanel />
                  <CommandPalette />
                </WorkspaceProvider>
              </UIProvider>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
