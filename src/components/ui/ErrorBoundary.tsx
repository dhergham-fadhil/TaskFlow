import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TaskFlow render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="ambient flex min-h-dvh items-center justify-center p-6">
          <div className="card w-full max-w-md p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <TriangleAlert size={24} />
            </div>
            <h1 className="mt-5 text-xl font-bold tracking-[-0.02em] text-ink">
              Something rendered unexpectedly
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The interface hit an error. Reloading usually fixes it — your tasks are saved in the
              demo workspace.
            </p>
            <pre className="mt-4 max-h-28 overflow-auto rounded-xl border border-line bg-raised p-3 text-left font-mono text-[10.5px] text-muted">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-[13px] font-semibold text-accent-ink"
            >
              Reload TaskFlow
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
