import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PresenceEngine,
  PRESENCE_DEFAULTS,
  withSensitivity,
  type PresenceSignals,
} from "@/lib/presence-verification";

const cfg = withSensitivity({ ...PRESENCE_DEFAULTS, sensitivity: "balanced" });

const present = (): PresenceSignals => ({
  faceDetected: true,
  lastFaceAt: Date.now(),
  lastMotionAt: Date.now(),
  cameraActive: true,
  tabVisible: true,
});

const absent = (): PresenceSignals => ({
  faceDetected: false,
  lastFaceAt: 0,
  lastMotionAt: 0,
  cameraActive: true,
  tabVisible: true,
});

function makeEngine() {
  const engine = new PresenceEngine({ ...PRESENCE_DEFAULTS }, "premium-deep-work-lab", 25);
  engine.start(true);
  return engine;
}

/** Advance fake time in 1s steps, feeding the given signals each tick. */
function run(engine: PresenceEngine, seconds: number, signals: () => PresenceSignals) {
  let snap = engine.snapshot();
  for (let i = 0; i < seconds; i++) {
    vi.advanceTimersByTime(1000);
    snap = engine.tick(signals());
  }
  return snap;
}

describe("PresenceEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T10:00:00Z"));
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("stays verified while any presence signal is fresh", () => {
    const engine = makeEngine();
    const snap = run(engine, 30, present);
    expect(snap.status).toBe("verified");
    expect(snap.presentRatio).toBeGreaterThan(0.9);
  });

  it("motion alone keeps the user present (body-presence layer)", () => {
    const engine = makeEngine();
    const snap = run(engine, 30, () => ({ ...absent(), lastMotionAt: Date.now() }));
    expect(snap.status).toBe("verified");
  });

  it("escalates warning → grace → at_risk → failed on continuous absence", () => {
    const engine = makeEngine();
    // Signals were never fresh, so absence accumulates from the first tick.
    let snap = run(engine, cfg.warningAfterSec + 2, absent);
    expect(snap.status).toBe("warning");

    snap = run(engine, cfg.warningDurationSec, absent);
    expect(snap.status).toBe("grace");
    expect(snap.countdownStage).toBe("grace");
    expect(snap.countdownSec).not.toBeNull();

    snap = run(engine, cfg.gracePeriodSec, absent);
    expect(snap.status).toBe("at_risk");

    snap = run(engine, cfg.atRiskCountdownSec + 2, absent);
    expect(snap.status).toBe("failed");
  });

  it("recovers to verified when presence returns during grace", () => {
    const engine = makeEngine();
    let snap = run(engine, 60, absent); // deep into grace
    expect(["grace", "warning"]).toContain(snap.status);
    snap = run(engine, 3, present);
    expect(snap.status).toBe("verified");
  });

  it("camera turning off counts as absence and records a drop", () => {
    const engine = makeEngine();
    run(engine, 5, present);
    const snap = run(engine, 5, () => ({ ...present(), cameraActive: false }));
    expect(snap.cameraDrops).toBe(1);
    expect(snap.absenceSec).toBeGreaterThan(0);
  });

  it("fails after exceeding max camera drops", () => {
    const engine = makeEngine();
    let snap = engine.snapshot();
    for (let i = 0; i <= cfg.maxCameraDrops; i++) {
      snap = run(engine, 3, present);
      snap = run(engine, 3, () => ({ ...present(), cameraActive: false }));
    }
    expect(snap.status).toBe("failed");
  });

  it("missed attention checks add suspicion and eventually fail", () => {
    const engine = makeEngine();
    run(engine, 5, present);
    for (let i = 0; i <= cfg.maxMissedAttentionChecks; i++) engine.recordAttentionCheck(false);
    const snap = run(engine, 2, present);
    expect(snap.status).toBe("failed");
    expect(snap.missedChecks).toBe(cfg.maxMissedAttentionChecks + 1);
  });

  it("completes with reward when presence ratio is high", () => {
    const engine = makeEngine();
    run(engine, 120, present);
    const { rewarded, presentRatio } = engine.complete();
    expect(rewarded).toBe(true);
    expect(presentRatio).toBeGreaterThanOrEqual(cfg.minPresenceRatio);
    expect(engine.snapshot().status).toBe("completed");
  });

  it("completes without reward when presence ratio is too low", () => {
    const engine = makeEngine();
    run(engine, 20, present);
    run(engine, 100, absent); // mostly absent — ratio well below threshold
    const { rewarded } = engine.complete();
    expect(rewarded).toBe(false);
  });

  it("flags sessions with repeated suspicious behaviour (anti-gaming)", () => {
    const engine = makeEngine();
    // Repeated camera drops + missed checks push the suspicion score up.
    for (let i = 0; i < 3; i++) {
      run(engine, 3, present);
      run(engine, 3, () => ({ ...present(), cameraActive: false }));
    }
    engine.recordAttentionCheck(false);
    const snap = run(engine, 2, present);
    expect(snap.suspicionScore).toBeGreaterThanOrEqual(cfg.flagSuspicionThreshold);
    expect(snap.flagged).toBe(true);
  });

  it("persists a session record with metadata only on completion", () => {
    const engine = makeEngine();
    run(engine, 60, present);
    engine.complete();
    const stored = JSON.parse(localStorage.getItem("clarity-presence-sessions") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe("completed");
    expect(stored[0].roomSlug).toBe("premium-deep-work-lab");
    // Privacy: the record must only contain scalar metadata — no media fields.
    expect(Object.keys(stored[0])).not.toContain("video");
    expect(Object.keys(stored[0])).not.toContain("image");
  });
});
