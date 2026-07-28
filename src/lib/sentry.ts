/**
 * There was no error tracking anywhere in this app — the ErrorBoundary
 * added this session only ever did console.error, which nobody watches in
 * production. A caught error was invisible unless a user happened to
 * screenshot a blank page and report it.
 *
 * @sentry/react is loaded via a dynamic import, not a static one. A static
 * `import * as Sentry from "@sentry/react"` here would pull the whole SDK
 * into whatever bundles this file — and this file is imported by both
 * main.tsx and ErrorBoundary.tsx, both eagerly loaded (Index.tsx is this
 * app's one eagerly-loaded route, explicitly for instant mobile first
 * paint). First attempt did exactly that: +30KB gzip on the one bundle
 * that's supposed to be leanest, more than 4x what the bundle-size pass
 * earlier this session had just saved. Dynamic import defers the fetch
 * until after first paint and puts it in its own chunk.
 *
 * DSNs are meant to be public (they can only submit events, never read
 * data) — same trust level as the GA4 measurement ID already in index.html.
 */
const DSN = "https://f9a4a8e49ba2d1a7278f768f36f30339@o4511790190559232.ingest.us.sentry.io/4511812220616704";

type SentryModule = typeof import("@sentry/react");
let sentryModule: SentryModule | null = null;

function loadSentry(): Promise<SentryModule> {
  return import("@sentry/react").then((mod) => {
    sentryModule = mod;
    return mod;
  });
}

export function initSentry() {
  // Don't even fetch the chunk in local dev — only report what real
  // visitors hit, and avoid every save-triggered reload spamming the project.
  if (!import.meta.env.PROD) return;

  const start = () =>
    loadSentry().then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        environment: import.meta.env.MODE,
        // Light performance tracing, not full session capture — no replay,
        // which would record real users' screens without asking first.
        tracesSampleRate: 0.1,
      });
    });

  // Defer past first paint. requestIdleCallback isn't in Safari; the
  // setTimeout fallback still gets this off the critical rendering path.
  if ("requestIdleCallback" in window) {
    (window as typeof window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(start);
  } else {
    setTimeout(start, 200);
  }
}

/**
 * Safe to call before Sentry has finished loading — falls back to
 * console.error so a very-early error (before the idle-deferred chunk
 * resolves) is still visible somewhere, just not in the Sentry dashboard.
 */
export function captureError(error: unknown, extra?: Record<string, unknown>) {
  if (sentryModule) {
    sentryModule.captureException(error, extra);
  } else if (import.meta.env.PROD) {
    console.error("[sentry] not loaded yet, error not reported:", error);
  }
}
