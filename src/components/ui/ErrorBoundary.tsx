import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Page error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-[#0a1a0f] min-h-full flex items-center justify-center">
          <div className="bg-[#0d2818] border border-[#e63946] p-8 max-w-md w-full">
            <p className="font-mono text-xs text-[#e63946] mb-2 tracking-widest">
              &gt; SYSTEM ERROR
            </p>
            <p className="font-mono text-sm text-[#d8f3dc] mb-6">
              {this.state.error}
            </p>
            <button
              className="hex-btn-outline text-xs px-4 py-2 border border-[#e63946] text-[#e63946] hover:bg-[#e63946] hover:text-[#0a1a0f] transition-colors"
              onClick={() => {
                this.setState({ hasError: false, error: '' })
                window.location.reload()
              }}>
              RELOAD MODULE
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
