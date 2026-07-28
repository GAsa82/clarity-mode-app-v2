import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Every lazy-loaded route in this app (~25 of them, src/App.tsx) had no
 * error boundary anywhere above it. The single most common real-world
 * trigger: a user has the site open in a tab from before a deploy, clicks a
 * nav link, and the browser requests a JS chunk hash that the new deploy no
 * longer serves — a plain uncaught error with no boundary crashes the whole
 * app to a blank white screen. That case is auto-recoverable (a fresh page
 * load fetches the current chunk map), so it retries once; everything else
 * gets a real fallback UI instead of a blank screen.
 */

const RELOAD_FLAG = "clarity-chunk-reload-attempted";

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Failed to fetch dynamically|Importing a module script failed|ChunkLoadError/i.test(
    message
  );
}

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      // Reload at most once per session — if the chunk is still missing
      // after a fresh load, looping would just spin forever.
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }
    console.error("[ErrorBoundary] caught:", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-2xl font-light mb-3">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This page hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={this.reset}
            className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }
}
