'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="glass-3d-card p-6 rounded-3xl border border-rose-500/20 bg-rose-950/10 flex flex-col items-center justify-center text-center space-y-4 min-h-[180px] w-full">
          <div className="w-12 h-12 rounded-full bg-rose-950/40 border border-rose-900/50 flex items-center justify-center text-rose-450 animate-pulse">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">{this.props.fallbackTitle || "Widget Connection Offline"}</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              An unexpected rendering exception was caught inside this module. Click retry to reload the widget DOM context.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-emerald-600/10"
          >
            <RefreshCw size={12} />
            <span>Try Reloading</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
