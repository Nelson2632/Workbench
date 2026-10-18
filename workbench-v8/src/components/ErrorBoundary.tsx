import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Render error caught:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          padding: 40,
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
            出了点问题
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px', maxWidth: 400 }}>
            这个组件遇到了一个错误，请尝试刷新页面恢复。
          </p>
          <button
            onClick={this.handleRefresh}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              background: 'var(--color-accent, #6366f1)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
          {this.state.error && (
            <details style={{ marginTop: 24, textAlign: 'left', maxWidth: 500 }}>
              <summary style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
                错误详情
              </summary>
              <pre style={{
                fontSize: 11,
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface-2, #f8fafc)',
                padding: 12,
                borderRadius: 6,
                overflow: 'auto',
                margin: '8px 0 0',
              }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}