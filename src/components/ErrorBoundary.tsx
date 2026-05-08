import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Virlo error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#060A0E',
            padding: 32,
          }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #FF4757, #e1306c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: 28,
              }}
            >
              !
            </div>
            <h1
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: 24,
                fontWeight: 700,
                color: '#ECF0F4',
                marginBottom: 12,
              }}
            >
              Something went wrong
            </h1>
            <p style={{ color: '#7A8FA0', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              An unexpected error occurred. Please try refreshing the page.
              If the issue persists, contact support.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="btn-primary"
              style={{ fontSize: 14, padding: '10px 24px' }}
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/dashboard'
              }}
              className="btn-secondary"
              style={{ fontSize: 14, padding: '10px 24px', marginLeft: 10 }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
