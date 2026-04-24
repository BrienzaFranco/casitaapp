"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container/40">
            <AlertCircle className="h-6 w-6 text-error" />
          </div>
          <p className="font-headline text-sm font-semibold text-on-surface">Algo salio mal</p>
          <p className="text-xs text-on-surface-variant max-w-xs">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded bg-secondary text-on-secondary text-xs font-medium hover:bg-secondary/90 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
