import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error) { console.error(error); }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl p-8 text-center">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Something went wrong</h1>
          <p className="mt-2 text-sm text-neutral-500">{this.state.error.message}</p>
          {this.props.fallback}
          <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
