/**
 * usePresenceVerification — React orchestrator for the Presence Verification
 * Engine. Owns the camera stream, runs the local detectors on low-cost
 * intervals, feeds fused signals to the engine, and exposes challenge state.
 *
 * Privacy: video never leaves this hook. Frames are analysed in-memory and
 * discarded; nothing is recorded, stored, or transmitted.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PresenceEngine,
  loadPresenceConfig,
  nextAttentionCheckDelayMs,
  type PresenceConfig,
  type PresenceSnapshot,
} from "@/lib/presence-verification";
import {
  createFaceDetector,
  createMotionDetector,
  type FaceDetectorHandle,
  type FaceDetectorTier,
  type MotionDetectorHandle,
} from "@/lib/presence-detectors";

export type ChallengePhase = "idle" | "requesting" | "active" | "completed" | "failed";

export type ChallengeResult = {
  rewarded: boolean;
  presentRatio: number;
  minutes: number;
  rewardMinutes: number;
  flagged: boolean;
};

export type AttentionCheckState = {
  /** Unix ms deadline to confirm. */
  deadline: number;
  timeoutSec: number;
};

type Params = {
  roomSlug: string;
  durationMin: number;
  onComplete?: (result: ChallengeResult) => void;
  onFail?: (reason: string) => void;
};

const TICK_MS = 1000;
const MOTION_MS = 1000;
const FACE_MS = 2500;

export function usePresenceVerification({ roomSlug, durationMin, onComplete, onFail }: Params) {
  const [phase, setPhase] = useState<ChallengePhase>("idle");
  const [snapshot, setSnapshot] = useState<PresenceSnapshot | null>(null);
  const [remainingSec, setRemainingSec] = useState(durationMin * 60);
  const [faceTier, setFaceTier] = useState<FaceDetectorTier | null>(null);
  const [attentionCheck, setAttentionCheck] = useState<AttentionCheckState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PresenceConfig | null>(null);
  const [result, setResult] = useState<ChallengeResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<PresenceEngine | null>(null);
  const faceRef = useRef<FaceDetectorHandle | null>(null);
  const motionRef = useRef<MotionDetectorHandle | null>(null);

  // Fused signal state (refs — updated by detectors, read by the tick loop).
  const sig = useRef({
    lastFaceAt: 0,
    lastMotionAt: 0,
    faceDetected: null as boolean | null,
    cameraActive: false,
    tabVisible: true,
    obstructed: false,
  });

  const timers = useRef<{ tick?: number; motion?: number; face?: number; check?: number; checkTimeout?: number }>({});
  const endAtRef = useRef(0);
  const faceBusy = useRef(false);

  // Keep latest callbacks without re-subscribing intervals.
  const onCompleteRef = useRef(onComplete);
  const onFailRef = useRef(onFail);
  onCompleteRef.current = onComplete;
  onFailRef.current = onFail;

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  const teardown = useCallback(() => {
    const t = timers.current;
    if (t.tick) window.clearInterval(t.tick);
    if (t.motion) window.clearInterval(t.motion);
    if (t.face) window.clearInterval(t.face);
    if (t.check) window.clearTimeout(t.check);
    if (t.checkTimeout) window.clearTimeout(t.checkTimeout);
    timers.current = {};
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    faceRef.current?.dispose();
    faceRef.current = null;
    motionRef.current?.dispose();
    motionRef.current = null;
    sig.current.cameraActive = false;
    setAttentionCheck(null);
  }, []);

  useEffect(() => () => {
    // Component unmounted mid-challenge → record as abandoned.
    engineRef.current?.abandon();
    teardown();
  }, [teardown]);

  // ─── Stream ↔ video attachment ─────────────────────────────────────────────
  // The <video> element only mounts when the UI switches to the "active"
  // phase — AFTER start() acquired the stream. Attaching inside start() hits
  // a null ref, leaving a black preview and blind detectors. This layout
  // effect re-attaches as soon as the element exists.

  useLayoutEffect(() => {
    const el = videoRef.current;
    const stream = streamRef.current;
    if (phase !== "active" || !el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      el.muted = true;
      el.play().catch(() => { /* autoplay policy — playsInline covers mobile */ });
    }
  }, [phase]);

  // ─── Tab visibility ────────────────────────────────────────────────────────

  useEffect(() => {
    const onVis = () => { sig.current.tabVisible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ─── Attention checks ──────────────────────────────────────────────────────

  const scheduleAttentionCheck = useCallback((cfg: PresenceConfig) => {
    if (!cfg.attentionChecksEnabled) return;
    const delay = nextAttentionCheckDelayMs(cfg);
    timers.current.check = window.setTimeout(() => {
      const engine = engineRef.current;
      if (!engine) return;
      // Skip checks too close to the finish line — ending on a prompt feels unfair.
      const remaining = (endAtRef.current - Date.now()) / 1000;
      if (remaining < cfg.attentionCheckTimeoutSec + 60) return;
      engine.attentionCheckShown();
      setAttentionCheck({
        deadline: Date.now() + cfg.attentionCheckTimeoutSec * 1000,
        timeoutSec: cfg.attentionCheckTimeoutSec,
      });
      timers.current.checkTimeout = window.setTimeout(() => {
        engineRef.current?.recordAttentionCheck(false);
        setAttentionCheck(null);
        scheduleAttentionCheck(cfg);
      }, cfg.attentionCheckTimeoutSec * 1000);
    }, delay);
  }, []);

  const confirmAttention = useCallback(() => {
    if (timers.current.checkTimeout) window.clearTimeout(timers.current.checkTimeout);
    engineRef.current?.recordAttentionCheck(true);
    setAttentionCheck(null);
    const cfg = engineRef.current?.config;
    if (cfg) scheduleAttentionCheck(cfg);
  }, [scheduleAttentionCheck]);

  // ─── Terminal transitions ──────────────────────────────────────────────────

  const finishCompleted = useCallback((cfg: PresenceConfig) => {
    const engine = engineRef.current;
    if (!engine) return;
    const { rewarded, presentRatio } = engine.complete();
    const snap = engine.snapshot();
    teardown();
    setSnapshot(snap);
    setPhase("completed");
    const res: ChallengeResult = {
      rewarded,
      presentRatio,
      minutes: durationMin,
      rewardMinutes: rewarded ? Math.round(durationMin * cfg.rewardMultiplier) : durationMin,
      flagged: snap.flagged,
    };
    setResult(res);
    onCompleteRef.current?.(res);
  }, [durationMin, teardown]);

  const finishFailed = useCallback((snap: PresenceSnapshot) => {
    teardown();
    setSnapshot(snap);
    setPhase("failed");
    onFailRef.current?.(snap.statusDetail);
  }, [teardown]);

  // ─── Start ─────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setPhase("requesting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support camera access. Try Chrome, Safari, or Samsung Internet.");
      setPhase("idle");
      return;
    }

    const cfg = await loadPresenceConfig();
    setConfig(cfg);

    // Low-res, low-fps front camera — reliable presence signal with minimal
    // battery/CPU cost on mobile. Never records audio.
    let stream: MediaStream | null = null;
    for (const constraints of [
      { video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 10, max: 15 } }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: true, audio: false },
    ] as MediaStreamConstraints[]) {
      try { stream = await navigator.mediaDevices.getUserMedia(constraints); break; }
      catch (e) {
        const name = (e as DOMException)?.name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("Camera permission denied. Presence verification needs your camera to run the challenge.");
          setPhase("idle");
          return;
        }
      }
    }
    if (!stream) {
      setError("Couldn't access the camera. Close other apps using it and try again.");
      setPhase("idle");
      return;
    }

    streamRef.current = stream;
    sig.current = { lastFaceAt: 0, lastMotionAt: 0, faceDetected: null, cameraActive: true, tabVisible: document.visibilityState === "visible", obstructed: false };

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.muted = true;
      await video.play().catch(() => { /* autoplay policies — playsInline covers it */ });
    }

    // Camera integrity: track ended/muted ⇒ camera no longer active.
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", () => { sig.current.cameraActive = false; });
      track.addEventListener("mute", () => { sig.current.cameraActive = false; });
      track.addEventListener("unmute", () => { sig.current.cameraActive = true; });
    });

    // Detectors — face detection loads lazily; motion works everywhere.
    const face = await createFaceDetector();
    faceRef.current = face;
    setFaceTier(face.tier);
    motionRef.current = createMotionDetector(cfg.motionSensitivity);

    const engine = new PresenceEngine(cfg, roomSlug, durationMin);
    engineRef.current = engine;
    engine.start(face.tier !== "none");

    endAtRef.current = Date.now() + durationMin * 60_000;
    setRemainingSec(durationMin * 60);
    setPhase("active");

    // Give the user a moment of "present" credit at start so the first
    // detector pass doesn't race the UI.
    sig.current.lastMotionAt = Date.now();

    // ── Motion loop (~1 fps, 48×36 px — negligible CPU) ──
    timers.current.motion = window.setInterval(() => {
      const v = videoRef.current;
      const m = motionRef.current;
      if (!v || !m) return;
      const { motion, obstructed } = m.sample(v);
      sig.current.obstructed = obstructed;
      if (motion && !obstructed) sig.current.lastMotionAt = Date.now();
    }, MOTION_MS);

    // ── Face loop (every 2.5 s, skipped while a detection is in flight) ──
    if (face.tier !== "none") {
      timers.current.face = window.setInterval(async () => {
        const v = videoRef.current;
        if (!v || faceBusy.current) return;
        faceBusy.current = true;
        try {
          const found = await face.detect(v);
          sig.current.faceDetected = found;
          if (found && !sig.current.obstructed) sig.current.lastFaceAt = Date.now();
        } finally {
          faceBusy.current = false;
        }
      }, FACE_MS);
    }

    // ── Engine tick (1 s) ──
    timers.current.tick = window.setInterval(() => {
      const eng = engineRef.current;
      if (!eng) return;
      const s = sig.current;
      const snap = eng.tick({
        faceDetected: s.faceDetected,
        lastFaceAt: s.obstructed ? 0 : s.lastFaceAt,
        lastMotionAt: s.obstructed ? 0 : s.lastMotionAt,
        cameraActive: s.cameraActive && !s.obstructed,
        tabVisible: s.tabVisible,
      });
      setSnapshot(snap);

      const remaining = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemainingSec(remaining);

      if (snap.status === "failed") finishFailed(snap);
      else if (remaining <= 0) finishCompleted(cfg);
    }, TICK_MS);

    scheduleAttentionCheck(cfg);
  }, [roomSlug, durationMin, scheduleAttentionCheck, finishCompleted, finishFailed]);

  // ─── Stop (voluntary leave) ────────────────────────────────────────────────

  const stop = useCallback(() => {
    engineRef.current?.abandon();
    engineRef.current = null;
    teardown();
    setSnapshot(null);
    setPhase("idle");
    setRemainingSec(durationMin * 60);
  }, [teardown, durationMin]);

  const reset = useCallback(() => {
    engineRef.current = null;
    teardown();
    setSnapshot(null);
    setResult(null);
    setError(null);
    setPhase("idle");
    setRemainingSec(durationMin * 60);
  }, [teardown, durationMin]);

  return {
    phase,
    snapshot,
    remainingSec,
    faceTier,
    attentionCheck,
    confirmAttention,
    videoRef,
    start,
    stop,
    reset,
    error,
    config,
    result,
  };
}
