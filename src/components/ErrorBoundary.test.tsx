import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb({ message }: { message: string }): never {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    // React logs caught errors to the console by design; keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows a fallback UI, not a blank screen, for an ordinary render error", () => {
    render(
      <ErrorBoundary>
        <Bomb message="regular render crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to home/i })).toBeInTheDocument();
  });

  it("auto-reloads once for a stale-chunk error instead of showing the fallback", () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <Bomb message="Failed to fetch dynamically imported module: /assets/AdminUsers-abc123.js" />
      </ErrorBoundary>
    );

    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("clarity-chunk-reload-attempted")).toBe("1");
  });

  it("does not reload a second time in the same session — shows the fallback instead", () => {
    sessionStorage.setItem("clarity-chunk-reload-attempted", "1");
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <Bomb message="Failed to fetch dynamically imported module: /assets/AdminUsers-abc123.js" />
      </ErrorBoundary>
    );

    // A second failure after a reload already happened means reloading again
    // won't help — this is the exact bug the first version of this file had:
    // render() returned null forever instead of ever showing the fallback.
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
