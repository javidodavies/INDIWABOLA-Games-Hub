import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1C1C1C] border border-white/15 rounded-xl p-6 space-y-4">
            <h1 className="font-display text-3xl font-extrabold text-[#B6FF00]">
              Match Interrupted
            </h1>
            <p className="text-sm text-white/75 leading-relaxed">
              A runtime or Firestore permission issue occurred while updating this view.
            </p>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-3 text-xs font-mono-tabular text-amber-300 break-words">
              {this.state.message}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] rounded-lg bg-[#B6FF00] text-[#0A0A0A] font-bold text-sm"
            >
              Reload INDIWABOLA Hub
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
