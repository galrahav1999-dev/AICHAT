"use client";

import React from "react";

// Keeps a runtime error in one view from white-screening the whole demo.
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("Cockpit view error:", error);
  }
  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full w-full place-items-center bg-ink-950 p-6">
          <div className="card max-w-md p-6 text-center">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">This view hit a snag</h3>
            <p className="mt-2 text-sm text-slate-400">It’s only this panel — your data and the rest of the app are fine.</p>
            {this.state.error?.message && (
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-900/80 p-2 text-left text-[11px] text-rose-300 ring-1 ring-white/5">
                {this.state.error.message}
                {this.state.error.stack ? "\n\n" + this.state.error.stack.split("\n").slice(1, 4).join("\n") : ""}
              </pre>
            )}
            <button onClick={this.reset} className="btn-primary mt-4">
              Reload this view
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
