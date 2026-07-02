/**
 * Presence Verification Engine — Premium Deep Work Lab
 *
 * A privacy-first, multi-signal state machine that verifies meaningful
 * participation in focus challenges. All video processing happens locally
 * in the browser; no frames are ever stored or transmitted. Only session
 * metadata (timestamps, status, counters) is persisted.
 *
 * Signal layers fused by the engine:
 *   1. Face detection      — strongest presence signal
 *   2. Body/motion presence — tolerates stretching, standing, posture shifts
 *   3. Attention checks     — periodic lightweight interaction prompts
 *   4. Session integrity    — camera state, tab visibility, device sleep
 *
 * No single signal can fail a challenge on its own; failure only happens
 * after a Warning → Grace Period → At Risk escalation with countdowns.
 */

import { supabase, isSupabaseReady } from "@/lib/supabase";
import { getSetting } from "@/lib/site-settings";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PresenceStatus =
  | "idle"          // challenge not started
  | "verified"      // Presence Verified
  | "warning"       // Warning — presence lost, gentle nudge
  | "grace"         // Grace Period Active — countdown running
  | "at_risk"       // Challenge At Risk — final countdown
  | "failed"        // Challenge Failed
  | "completed";    // Challenge Completed

export type SensitivityPreset = "relaxed" | "balanced" | "strict";

export type PresenceConfig = {
  /** Seconds of continuous absence before a Warning is shown. */
  warningAfterSec: number;
  /** Seconds the Warning stage lasts before the Grace Period starts. */
  warningDurationSec: number;
  /** Grace Period length (water break / stretch allowance). */
  gracePeriodSec: number;
  /** Final "Challenge At Risk" countdown before failure. */
  atRiskCountdownSec: number;
  /** Seconds a face/motion signal stays valid ("body presence" window). */
  presenceSignalTtlSec: number;

  /** Attention checks — periodic lightweight focus confirmations. */
  attentionChecksEnabled: boolean;
  attentionCheckMinGapMin: number;
  attentionCheckMaxGapMin: number;
  attentionCheckTimeoutSec: number;
  maxMissedAttentionChecks: number;

  /** Session integrity limits. */
  maxCameraDrops: number;
  maxTabAwaySec: number;
  maxSleepGapSec: number;

  /** Fraction of the challenge the user must be present for full credit. */
  minPresenceRatio: number;

  /** Detection tuning. */
  sensitivity: SensitivityPreset;
  /** 0..1 — how much pixel change counts as motion (higher = more sensitive). */
  motionSensitivity: number;

  /** Challenge + reward rules (admin configurable). */
  challengeDurationsMin: number[];
  rewardMultiplier: number;

  /** Anti-gaming: suspicion score at/above which a session is flagged. */
  flagSuspicionThreshold: number;
};

export const PRESENCE_DEFAULTS: PresenceConfig = {
  warningAfterSec: 15,
  warningDurationSec: 15,
  gracePeriodSec: 90,
  atRiskCountdownSec: 30,
  presenceSignalTtlSec: 12,

  attentionChecksEnabled: true,
  attentionCheckMinGapMin: 10,
  attentionCheckMaxGapMin: 20,
  attentionCheckTimeoutSec: 45,
  maxMissedAttentionChecks: 2,

  maxCameraDrops: 3,
  maxTabAwaySec: 45,
  maxSleepGapSec: 60,

  minPresenceRatio: 0.8,

  sensitivity: "balanced",
  motionSensitivity: 0.5,

  challengeDurationsMin: [25, 50, 90],
  rewardMultiplier: 1.5,

  flagSuspicionThreshold: 5,
};

/** Preset overlays applied on top of the stored config. */
const SENSITIVITY_PRESETS: Record<SensitivityPreset, Partial<PresenceConfig>> = {
  relaxed:  { warningAfterSec: 25, gracePeriodSec: 150, maxTabAwaySec: 90,  minPresenceRatio: 0.7 },
  balanced: {},
  strict:   { warningAfterSec: 10, gracePeriodSec: 60,  maxTabAwaySec: 20,  minPresenceRatio: 0.9 },
};

export function withSensitivity(cfg: PresenceConfig): PresenceConfig {
  return { ...cfg, ...SENSITIVITY_PRESETS[cfg.sensitivity] };
}

// ─── Config persistence ──────────────────────────────────────────────────────

const CONFIG_KEY = "clarity-presence-config";
export const PRESENCE_SETTINGS_KEY = "presence_verification"; // site_settings key
const CONSENT_KEY = "clarity-presence-consent";
const SESSIONS_KEY = "clarity-presence-sessions";

/** Local (device) config — admin site_settings act as the shared default. */
export function getLocalPresenceConfig(): PresenceConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...PRESENCE_DEFAULTS, ...JSON.parse(raw) } : { ...PRESENCE_DEFAULTS };
  } catch {
    return { ...PRESENCE_DEFAULTS };
  }
}

export function saveLocalPresenceConfig(cfg: Partial<PresenceConfig>) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...getLocalPresenceConfig(), ...cfg }));
}

/** Merged config: defaults ← admin site_settings ← local cache. */
export async function loadPresenceConfig(): Promise<PresenceConfig> {
  let admin: Partial<PresenceConfig> | null = null;
  if (isSupabaseReady()) {
    try { admin = await getSetting<Partial<PresenceConfig>>(PRESENCE_SETTINGS_KEY); } catch { /* offline ok */ }
  }
  const merged = { ...PRESENCE_DEFAULTS, ...(admin ?? {}) };
  // Cache the merged config locally so challenges work offline next time.
  localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
  return merged;
}

// ─── Consent ─────────────────────────────────────────────────────────────────

export function hasPresenceConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === "granted";
}

export function setPresenceConsent(granted: boolean) {
  if (granted) localStorage.setItem(CONSENT_KEY, "granted");
  else localStorage.removeItem(CONSENT_KEY);
}

// ─── Session records (metadata only — never video) ──────────────────────────

export type PresenceEventType =
  | "start" | "presence_lost" | "presence_restored" | "warning" | "grace"
  | "at_risk" | "camera_drop" | "camera_restored" | "tab_away" | "tab_return"
  | "sleep_gap" | "attention_check_shown" | "attention_check_passed"
  | "attention_check_missed" | "failed" | "completed" | "abandoned";

export type PresenceEvent = { t: number; type: PresenceEventType; detail?: string };

export type PresenceSessionRecord = {
  id: string;
  roomSlug: string;
  startedAt: number;
  endedAt: number;
  plannedMin: number;
  elapsedSec: number;
  presentSec: number;
  presentRatio: number;
  status: "completed" | "failed" | "abandoned";
  failReason?: string;
  cameraDrops: number;
  tabAways: number;
  longAbsences: number;
  missedChecks: number;
  passedChecks: number;
  sleepGaps: number;
  suspicionScore: number;
  flagged: boolean;
  flagReasons: string[];
  faceDetectionAvailable: boolean;
};

export function getPresenceSessions(): PresenceSessionRecord[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessionRecord(rec: PresenceSessionRecord) {
  const all = getPresenceSessions();
  all.unshift(rec);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all.slice(0, 20)));
}

/** Best-effort sync to Supabase so admins can review flagged sessions. */
async function syncSessionRecord(rec: PresenceSessionRecord) {
  if (!isSupabaseReady()) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // anonymous sessions stay local-only
    await supabase.from("presence_sessions").insert({
      user_id: user.id,
      room_slug: rec.roomSlug,
      started_at: new Date(rec.startedAt).toISOString(),
      ended_at: new Date(rec.endedAt).toISOString(),
      planned_min: rec.plannedMin,
      elapsed_sec: rec.elapsedSec,
      present_sec: rec.presentSec,
      present_ratio: rec.presentRatio,
      status: rec.status,
      fail_reason: rec.failReason ?? null,
      suspicion_score: rec.suspicionScore,
      flagged: rec.flagged,
      flag_reasons: rec.flagReasons,
      counters: {
        cameraDrops: rec.cameraDrops,
        tabAways: rec.tabAways,
        longAbsences: rec.longAbsences,
        missedChecks: rec.missedChecks,
        passedChecks: rec.passedChecks,
        sleepGaps: rec.sleepGaps,
      },
    });
  } catch { /* table may not exist yet / offline — local record is the fallback */ }
}

// ─── Engine ──────────────────────────────────────────────────────────────────

/** Signals sampled by the hook and fed to the engine every tick (~1s). */
export type PresenceSignals = {
  /** true = face in frame, false = no face, null = face detection unavailable */
  faceDetected: boolean | null;
  /** Unix ms of the last detected face (0 = never). */
  lastFaceAt: number;
  /** Unix ms of the last detected body motion (0 = never). */
  lastMotionAt: number;
  cameraActive: boolean;
  tabVisible: boolean;
};

export type PresenceSnapshot = {
  status: PresenceStatus;
  /** Seconds of continuous absence (0 while present). */
  absenceSec: number;
  /** Seconds remaining in the current countdown stage (grace / at-risk), or null. */
  countdownSec: number | null;
  /** Which stage the countdown belongs to. */
  countdownStage: "grace" | "at_risk" | null;
  elapsedSec: number;
  presentSec: number;
  presentRatio: number;
  /** Human-readable reason for the current non-verified state. */
  statusDetail: string;
  suspicionScore: number;
  flagged: boolean;
  cameraDrops: number;
  missedChecks: number;
  passedChecks: number;
  events: PresenceEvent[];
};

const LONG_ABSENCE_SEC = 60;

export class PresenceEngine {
  private cfg: PresenceConfig;
  private roomSlug: string;
  private plannedMin: number;
  private faceAvailable = false;

  private startedAt = 0;
  private lastTickAt = 0;
  private elapsedSec = 0;
  private presentSec = 0;

  private status: PresenceStatus = "idle";
  private statusDetail = "";
  private absenceSec = 0;
  private currentAbsenceStart = 0;

  private tabHiddenAt = 0;
  private cameraWasActive = true;

  private cameraDrops = 0;
  private tabAways = 0;
  private longAbsences = 0;
  private missedChecks = 0;
  private passedChecks = 0;
  private sleepGaps = 0;
  private suspicionScore = 0;
  private flagReasons: string[] = [];

  private events: PresenceEvent[] = [];
  private ended = false;

  constructor(cfg: PresenceConfig, roomSlug: string, plannedMin: number) {
    this.cfg = withSensitivity(cfg);
    this.roomSlug = roomSlug;
    this.plannedMin = plannedMin;
  }

  get config(): PresenceConfig { return this.cfg; }

  start(faceDetectionAvailable: boolean) {
    this.faceAvailable = faceDetectionAvailable;
    this.startedAt = Date.now();
    this.lastTickAt = this.startedAt;
    this.status = "verified";
    this.statusDetail = "Presence verified";
    this.log("start", faceDetectionAvailable ? "face detection active" : "motion-based presence");
  }

  private log(type: PresenceEventType, detail?: string) {
    this.events.push({ t: Date.now(), type, detail });
    if (this.events.length > 200) this.events.splice(0, this.events.length - 200);
  }

  private suspect(points: number, reason: string) {
    this.suspicionScore += points;
    if (!this.flagReasons.includes(reason)) this.flagReasons.push(reason);
  }

  get isFlagged(): boolean {
    return this.suspicionScore >= this.cfg.flagSuspicionThreshold;
  }

  /**
   * Multi-signal presence fusion. A user is "present" when the camera is
   * active AND at least one presence layer fired recently:
   *   - face seen within the signal TTL, or
   *   - body motion within the TTL (covers stretching / face briefly out of frame)
   * No single missing signal fails the check.
   */
  private isPresent(sig: PresenceSignals, now: number): boolean {
    if (!sig.cameraActive) return false;
    const ttl = this.cfg.presenceSignalTtlSec * 1000;
    const faceFresh = sig.lastFaceAt > 0 && now - sig.lastFaceAt < ttl;
    const motionFresh = sig.lastMotionAt > 0 && now - sig.lastMotionAt < ttl * 2; // body layer is more forgiving
    // Tab hidden throttles detectors — don't count stale signals as absence
    // until maxTabAwaySec has passed (handled in tick()).
    return faceFresh || motionFresh;
  }

  /** Feed the latest signals; call roughly once per second. */
  tick(sig: PresenceSignals): PresenceSnapshot {
    const now = Date.now();
    if (this.ended || this.status === "idle") return this.snapshot(now);

    // ── Device sleep / suspend detection via wall-clock drift ──
    const gapSec = (now - this.lastTickAt) / 1000;
    if (gapSec > this.cfg.maxSleepGapSec) {
      this.sleepGaps += 1;
      this.suspect(1, "device_sleep");
      this.log("sleep_gap", `${Math.round(gapSec)}s`);
      // Sleep time counts as absence: backdate the absence start.
      if (!this.currentAbsenceStart) this.currentAbsenceStart = this.lastTickAt;
    }
    this.elapsedSec += Math.min(gapSec, this.cfg.maxSleepGapSec);
    this.lastTickAt = now;

    // ── Camera integrity ──
    if (this.cameraWasActive && !sig.cameraActive) {
      this.cameraDrops += 1;
      if (this.cameraDrops > 1) this.suspect(2, "repeated_camera_drops");
      this.log("camera_drop", `#${this.cameraDrops}`);
    } else if (!this.cameraWasActive && sig.cameraActive) {
      this.log("camera_restored");
    }
    this.cameraWasActive = sig.cameraActive;

    // ── Tab visibility integrity ──
    if (!sig.tabVisible && !this.tabHiddenAt) {
      this.tabHiddenAt = now;
      this.log("tab_away");
    } else if (sig.tabVisible && this.tabHiddenAt) {
      const awaySec = (now - this.tabHiddenAt) / 1000;
      if (awaySec > this.cfg.maxTabAwaySec) {
        this.tabAways += 1;
        this.suspect(1, "extended_tab_away");
      }
      this.tabHiddenAt = 0;
      this.log("tab_return", `${Math.round(awaySec)}s`);
    }

    // ── Presence fusion ──
    const tabAwaySec = this.tabHiddenAt ? (now - this.tabHiddenAt) / 1000 : 0;
    const tabToleranceOk = tabAwaySec <= this.cfg.maxTabAwaySec;
    const present = this.isPresent(sig, now) && (sig.tabVisible || tabToleranceOk);

    if (present) {
      this.presentSec += Math.min(gapSec, 5);
      if (this.currentAbsenceStart) {
        const absence = (now - this.currentAbsenceStart) / 1000;
        if (absence >= LONG_ABSENCE_SEC) {
          this.longAbsences += 1;
          this.suspect(1, "long_absence");
        }
        this.currentAbsenceStart = 0;
        if (this.status === "warning" || this.status === "grace" || this.status === "at_risk") {
          this.log("presence_restored", `after ${Math.round(absence)}s`);
        }
      }
      this.absenceSec = 0;
      if (this.status !== "verified") {
        this.status = "verified";
        this.statusDetail = "Presence verified";
      }
    } else {
      if (!this.currentAbsenceStart) {
        this.currentAbsenceStart = now;
        this.log("presence_lost", !sig.cameraActive ? "camera off" : !sig.tabVisible ? "tab hidden" : "not detected");
      }
      this.absenceSec = (now - this.currentAbsenceStart) / 1000;
      this.escalate(sig);
    }

    // ── Hard integrity failures (never from a single signal blip) ──
    if (this.status !== "failed") {
      if (this.cameraDrops > this.cfg.maxCameraDrops) {
        this.fail(`Camera was disconnected ${this.cameraDrops} times`);
      } else if (this.missedChecks > this.cfg.maxMissedAttentionChecks) {
        this.fail("Too many missed focus confirmations");
      }
    }

    return this.snapshot(now);
  }

  /** Warning → Grace → At Risk → Failed escalation with countdowns. */
  private escalate(sig: PresenceSignals) {
    const c = this.cfg;
    const a = this.absenceSec;
    const warnEnd = c.warningAfterSec + c.warningDurationSec;
    const graceEnd = warnEnd + c.gracePeriodSec;
    const failAt = graceEnd + c.atRiskCountdownSec;

    const cause = !sig.cameraActive ? "Camera is off"
      : !sig.tabVisible ? "Tab is in the background"
      : "We can't see you in frame";

    if (a < c.warningAfterSec) return; // still within normal tolerance

    if (a < warnEnd) {
      if (this.status !== "warning") { this.status = "warning"; this.log("warning"); }
      this.statusDetail = `${cause} — everything OK?`;
    } else if (a < graceEnd) {
      if (this.status !== "grace") { this.status = "grace"; this.log("grace"); }
      this.statusDetail = `${cause} — grace period running. Come back when you're ready.`;
    } else if (a < failAt) {
      if (this.status !== "at_risk") { this.status = "at_risk"; this.log("at_risk"); }
      this.statusDetail = `${cause} — return now or the challenge will end.`;
    } else {
      this.fail("Extended absence — presence could not be verified");
    }
  }

  // ── Attention checks ──
  attentionCheckShown() { this.log("attention_check_shown"); }

  recordAttentionCheck(passed: boolean) {
    if (passed) {
      this.passedChecks += 1;
      this.log("attention_check_passed");
    } else {
      this.missedChecks += 1;
      this.suspect(2, "missed_attention_checks");
      this.log("attention_check_missed", `#${this.missedChecks}`);
    }
  }

  // ── Terminal transitions ──
  private fail(reason: string) {
    if (this.ended) return;
    this.status = "failed";
    this.statusDetail = reason;
    this.log("failed", reason);
    this.finish("failed", reason);
  }

  /** Called by the hook when the challenge timer reaches zero. */
  complete(): { rewarded: boolean; presentRatio: number } {
    if (this.ended) return { rewarded: false, presentRatio: this.ratio() };
    const ratio = this.ratio();
    const rewarded = ratio >= this.cfg.minPresenceRatio && !this.isFlagged;
    if (ratio < this.cfg.minPresenceRatio) this.suspect(1, "low_presence_ratio");
    this.status = "completed";
    this.statusDetail = rewarded
      ? "Challenge completed — presence verified"
      : "Completed, but presence was too low for full credit";
    this.log("completed", `ratio=${ratio.toFixed(2)}`);
    this.finish("completed");
    return { rewarded, presentRatio: ratio };
  }

  /** User leaves voluntarily before the end. */
  abandon() {
    if (this.ended) return;
    this.log("abandoned");
    this.finish("abandoned");
    this.status = "idle";
  }

  private ratio(): number {
    return this.elapsedSec > 0 ? Math.min(1, this.presentSec / this.elapsedSec) : 0;
  }

  private finish(status: "completed" | "failed" | "abandoned", failReason?: string) {
    this.ended = true;
    const rec: PresenceSessionRecord = {
      id: `pv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      roomSlug: this.roomSlug,
      startedAt: this.startedAt,
      endedAt: Date.now(),
      plannedMin: this.plannedMin,
      elapsedSec: Math.round(this.elapsedSec),
      presentSec: Math.round(this.presentSec),
      presentRatio: Number(this.ratio().toFixed(3)),
      status,
      failReason,
      cameraDrops: this.cameraDrops,
      tabAways: this.tabAways,
      longAbsences: this.longAbsences,
      missedChecks: this.missedChecks,
      passedChecks: this.passedChecks,
      sleepGaps: this.sleepGaps,
      suspicionScore: this.suspicionScore,
      flagged: this.isFlagged,
      flagReasons: [...this.flagReasons],
      faceDetectionAvailable: this.faceAvailable,
    };
    saveSessionRecord(rec);
    void syncSessionRecord(rec);
  }

  snapshot(now = Date.now()): PresenceSnapshot {
    const c = this.cfg;
    const warnEnd = c.warningAfterSec + c.warningDurationSec;
    const graceEnd = warnEnd + c.gracePeriodSec;
    const failAt = graceEnd + c.atRiskCountdownSec;

    let countdownSec: number | null = null;
    let countdownStage: "grace" | "at_risk" | null = null;
    if (this.status === "grace") {
      countdownSec = Math.max(0, Math.ceil(graceEnd - this.absenceSec));
      countdownStage = "grace";
    } else if (this.status === "at_risk") {
      countdownSec = Math.max(0, Math.ceil(failAt - this.absenceSec));
      countdownStage = "at_risk";
    }

    return {
      status: this.status,
      absenceSec: Math.round(this.absenceSec),
      countdownSec,
      countdownStage,
      elapsedSec: Math.round(this.elapsedSec),
      presentSec: Math.round(this.presentSec),
      presentRatio: this.ratio(),
      statusDetail: this.statusDetail,
      suspicionScore: this.suspicionScore,
      flagged: this.isFlagged,
      cameraDrops: this.cameraDrops,
      missedChecks: this.missedChecks,
      passedChecks: this.passedChecks,
      events: this.events.slice(-30),
    };
  }
}

// ─── Attention check scheduling helper ───────────────────────────────────────

export function nextAttentionCheckDelayMs(cfg: PresenceConfig): number {
  const min = cfg.attentionCheckMinGapMin * 60_000;
  const max = cfg.attentionCheckMaxGapMin * 60_000;
  return min + Math.random() * Math.max(0, max - min);
}
