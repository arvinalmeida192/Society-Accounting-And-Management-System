import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  title?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  retryKey: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Screen render error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <section className="error-boundary">
          <h2>{this.props.title ?? 'This screen could not be loaded'}</h2>
          <p className="error-text">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() =>
              this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }))
            }
          >
            Try Again
          </button>
        </section>
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
