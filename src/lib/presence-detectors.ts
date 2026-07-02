/**
 * Presence detectors — all processing happens locally in the browser.
 * No frames are stored, uploaded, or shared. Everything is disposed when
 * the challenge ends.
 *
 * Face detection is tiered for maximum device coverage at minimum cost:
 *   1. Native FaceDetector (Shape Detection API) — free, hardware backed
 *   2. MediaPipe BlazeFace (lazy-loaded WASM)     — runs on-device
 *   3. none — the engine falls back to motion-based body presence
 *
 * Motion detection uses tiny down-scaled frame differencing (48×36 px),
 * which costs well under 1 ms per sample and is battery friendly on mobile.
 */

// ─── Face detection ──────────────────────────────────────────────────────────

export type FaceDetectorTier = "native" | "mediapipe" | "none";

export type FaceDetectorHandle = {
  tier: FaceDetectorTier;
  /** Returns true if at least one human face is visible in the frame. */
  detect: (video: HTMLVideoElement) => Promise<boolean>;
  dispose: () => void;
};

type NativeFaceDetector = {
  detect: (source: CanvasImageSource) => Promise<Array<unknown>>;
};

const MEDIAPIPE_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const BLAZEFACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

async function tryNativeDetector(): Promise<FaceDetectorHandle | null> {
  const Ctor = (window as unknown as { FaceDetector?: new (opts?: object) => NativeFaceDetector }).FaceDetector;
  if (!Ctor) return null;
  try {
    const det = new Ctor({ fastMode: true, maxDetectedFaces: 1 });
    // Probe with a tiny canvas — some browsers expose the API but fail on use.
    const probe = document.createElement("canvas");
    probe.width = 16; probe.height = 16;
    await det.detect(probe);
    return {
      tier: "native",
      detect: async (video) => {
        try {
          const faces = await det.detect(video);
          return faces.length > 0;
        } catch { return false; }
      },
      dispose: () => {},
    };
  } catch {
    return null;
  }
}

async function tryMediapipeDetector(): Promise<FaceDetectorHandle | null> {
  try {
    const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);
    let detector;
    try {
      detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: BLAZEFACE_MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.4,
      });
    } catch {
      detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: BLAZEFACE_MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.4,
      });
    }
    let lastTs = 0;
    return {
      tier: "mediapipe",
      detect: async (video) => {
        if (video.readyState < 2 || video.videoWidth === 0) return false;
        // detectForVideo requires monotonically increasing timestamps.
        const ts = Math.max(performance.now(), lastTs + 1);
        lastTs = ts;
        try {
          const result = detector.detectForVideo(video, ts);
          return result.detections.length > 0;
        } catch { return false; }
      },
      dispose: () => { try { detector.close(); } catch { /* already closed */ } },
    };
  } catch {
    return null; // offline / CDN blocked / unsupported — motion layer takes over
  }
}

/** Resolve the best available face detector for this device. */
export async function createFaceDetector(): Promise<FaceDetectorHandle> {
  const native = await tryNativeDetector();
  if (native) return native;
  const mediapipe = await tryMediapipeDetector();
  if (mediapipe) return mediapipe;
  return { tier: "none", detect: async () => false, dispose: () => {} };
}

// ─── Motion / body presence + obstruction detection ─────────────────────────

export type MotionSample = {
  /** Pixel change vs. previous frame exceeded the sensitivity threshold. */
  motion: boolean;
  /** Frame is nearly uniform (lens covered, pitch dark, or pure white). */
  obstructed: boolean;
};

export type MotionDetectorHandle = {
  sample: (video: HTMLVideoElement) => MotionSample;
  dispose: () => void;
};

const MOTION_W = 48;
const MOTION_H = 36;

/**
 * Frame-differencing motion detector.
 * @param sensitivity 0..1 — higher detects smaller movements.
 */
export function createMotionDetector(sensitivity = 0.5): MotionDetectorHandle {
  const canvas = document.createElement("canvas");
  canvas.width = MOTION_W;
  canvas.height = MOTION_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let prev: Uint8ClampedArray | null = null;

  // Map sensitivity to a per-pixel luma delta threshold (strict 28 → loose 10)
  // and a changed-pixel-percentage threshold (strict 4% → loose 1%).
  const pixelDelta = 28 - sensitivity * 18;
  const changedPct = 0.04 - sensitivity * 0.03;

  return {
    sample: (video) => {
      if (!ctx || video.readyState < 2 || video.videoWidth === 0) {
        return { motion: false, obstructed: false };
      }
      ctx.drawImage(video, 0, 0, MOTION_W, MOTION_H);
      const { data } = ctx.getImageData(0, 0, MOTION_W, MOTION_H);
      const n = MOTION_W * MOTION_H;

      // Luma per pixel + running stats for obstruction detection.
      const luma = new Uint8ClampedArray(n);
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        const y = (data[o] * 3 + data[o + 1] * 4 + data[o + 2]) >> 3;
        luma[i] = y;
        sum += y;
      }
      const mean = sum / n;
      let variance = 0;
      for (let i = 0; i < n; i++) {
        const d = luma[i] - mean;
        variance += d * d;
      }
      variance /= n;
      // Uniform very dark or very bright frame with almost no texture ⇒ lens
      // covered or camera obstructed.
      const obstructed = variance < 40 && (mean < 25 || mean > 235);

      let motion = false;
      if (prev) {
        let changed = 0;
        for (let i = 0; i < n; i++) {
          if (Math.abs(luma[i] - prev[i]) > pixelDelta) changed++;
        }
        motion = changed / n > changedPct;
      }
      prev = luma;
      return { motion, obstructed };
    },
    dispose: () => { prev = null; },
  };
}
