import { useEffect, useState } from "react";
import {
  AlertCircle, CheckCircle, Eye, Flag, RotateCcw, Save, ScanFace, Shield, Timer, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase, isSupabaseReady } from "@/lib/supabase";
import { setSetting } from "@/lib/site-settings";
import {
  loadPresenceConfig, PRESENCE_DEFAULTS, PRESENCE_SETTINGS_KEY,
  type PresenceConfig, type SensitivityPreset,
} from "@/lib/presence-verification";

type FlaggedSession = {
  id: string;
  user_id: string;
  room_slug: string;
  started_at: string;
  planned_min: number;
  present_ratio: number;
  status: string;
  fail_reason: string | null;
  suspicion_score: number;
  flag_reasons: string[];
  counters: Record<string, number> | null;
};

export default function PresenceVerificationAdmin() {
  const [cfg, setCfg] = useState<PresenceConfig>(PRESENCE_DEFAULTS);
  const [durationsText, setDurationsText] = useState(PRESENCE_DEFAULTS.challengeDurationsMin.join(", "));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<FlaggedSession[]>([]);
  const [flaggedError, setFlaggedError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const c = await loadPresenceConfig();
      setCfg(c);
      setDurationsText(c.challengeDurationsMin.join(", "));
      setLoading(false);
      if (isSupabaseReady()) {
        const { data, error: qErr } = await supabase
          .from("presence_sessions")
          .select("*")
          .eq("flagged", true)
          .order("started_at", { ascending: false })
          .limit(50);
        if (qErr) setFlaggedError(qErr.message);
        else setFlagged((data as FlaggedSession[]) ?? []);
      }
    })();
  }, []);

  const set = <K extends keyof PresenceConfig>(key: K, value: PresenceConfig[K]) =>
    setCfg((c) => ({ ...c, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const durations = durationsText
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n >= 5 && n <= 240);
    const next = { ...cfg, challengeDurationsMin: durations.length ? durations : PRESENCE_DEFAULTS.challengeDurationsMin };
    setCfg(next);
    const { error: err } = await setSetting(
      PRESENCE_SETTINGS_KEY,
      next,
      "Presence Verification config for Deep Work Challenges"
    );
    if (err) setError(err.message);
    else {
      localStorage.setItem("clarity-presence-config", JSON.stringify(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const handleReset = () => {
    setCfg({ ...PRESENCE_DEFAULTS });
    setDurationsText(PRESENCE_DEFAULTS.challengeDurationsMin.join(", "));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-light flex items-center gap-2">
            <ScanFace className="w-6 h-6 text-primary" />
            Presence Verification
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure Deep Work Challenge verification, grace periods, rewards, and anti-gaming rules.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saved ? <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            {saved ? "Saved" : saving ? "Saving…" : "Save config"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* ── Presence thresholds ── */}
      <Section icon={Timer} title="Presence thresholds & grace periods"
        subtitle="How long a user can be away before each escalation stage. Failure only happens after Warning → Grace → At Risk.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NumField label="Warning after (sec)" value={cfg.warningAfterSec} min={5} max={120} onChange={(v) => set("warningAfterSec", v)} />
          <NumField label="Warning stage (sec)" value={cfg.warningDurationSec} min={5} max={120} onChange={(v) => set("warningDurationSec", v)} />
          <NumField label="Grace period (sec)" value={cfg.gracePeriodSec} min={15} max={600} onChange={(v) => set("gracePeriodSec", v)} />
          <NumField label="At-risk countdown (sec)" value={cfg.atRiskCountdownSec} min={10} max={180} onChange={(v) => set("atRiskCountdownSec", v)} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Total absence before failure:{" "}
          <span className="text-foreground font-medium">
            {cfg.warningAfterSec + cfg.warningDurationSec + cfg.gracePeriodSec + cfg.atRiskCountdownSec}s
          </span>
        </p>
      </Section>

      {/* ── Sensitivity ── */}
      <Section icon={Eye} title="Verification sensitivity"
        subtitle="Presets adjust thresholds; motion sensitivity tunes the body-presence detector.">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <FieldLabel>Preset</FieldLabel>
            <div className="flex gap-2">
              {(["relaxed", "balanced", "strict"] as SensitivityPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("sensitivity", p)}
                  className={`px-4 py-2 rounded-xl border text-xs capitalize transition-all ${
                    cfg.sensitivity === p
                      ? "bg-primary/15 border-primary/40 text-primary font-medium"
                      : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/25"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="w-48">
            <FieldLabel>Motion sensitivity — {Math.round(cfg.motionSensitivity * 100)}%</FieldLabel>
            <input
              type="range" min={0} max={100} value={Math.round(cfg.motionSensitivity * 100)}
              onChange={(e) => set("motionSensitivity", Number(e.target.value) / 100)}
              className="w-full accent-primary"
            />
          </div>
          <NumField label="Min presence for credit (%)" value={Math.round(cfg.minPresenceRatio * 100)} min={50} max={100}
            onChange={(v) => set("minPresenceRatio", v / 100)} />
        </div>
      </Section>

      {/* ── Attention checks ── */}
      <Section icon={Zap} title="Attention checks"
        subtitle="Periodic lightweight prompts asking the user to tap and confirm focus.">
        <div className="flex items-center gap-3 mb-4">
          <Switch checked={cfg.attentionChecksEnabled} onCheckedChange={(v) => set("attentionChecksEnabled", v)} />
          <span className="text-xs">{cfg.attentionChecksEnabled ? "Enabled" : "Disabled"}</span>
        </div>
        {cfg.attentionChecksEnabled && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NumField label="Min gap (min)" value={cfg.attentionCheckMinGapMin} min={2} max={60} onChange={(v) => set("attentionCheckMinGapMin", v)} />
            <NumField label="Max gap (min)" value={cfg.attentionCheckMaxGapMin} min={2} max={90} onChange={(v) => set("attentionCheckMaxGapMin", v)} />
            <NumField label="Timeout (sec)" value={cfg.attentionCheckTimeoutSec} min={15} max={180} onChange={(v) => set("attentionCheckTimeoutSec", v)} />
            <NumField label="Max missed" value={cfg.maxMissedAttentionChecks} min={0} max={10} onChange={(v) => set("maxMissedAttentionChecks", v)} />
          </div>
        )}
      </Section>

      {/* ── Integrity & anti-gaming ── */}
      <Section icon={Shield} title="Session integrity & anti-gaming"
        subtitle="Limits on camera drops, tab abandonment, and the suspicion score that flags a session for review.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NumField label="Max camera drops" value={cfg.maxCameraDrops} min={0} max={10} onChange={(v) => set("maxCameraDrops", v)} />
          <NumField label="Max tab-away (sec)" value={cfg.maxTabAwaySec} min={10} max={300} onChange={(v) => set("maxTabAwaySec", v)} />
          <NumField label="Sleep-gap trigger (sec)" value={cfg.maxSleepGapSec} min={20} max={300} onChange={(v) => set("maxSleepGapSec", v)} />
          <NumField label="Flag at suspicion ≥" value={cfg.flagSuspicionThreshold} min={1} max={20} onChange={(v) => set("flagSuspicionThreshold", v)} />
        </div>
      </Section>

      {/* ── Challenge & rewards ── */}
      <Section icon={Flag} title="Challenge & reward rules" subtitle="Durations offered to users and the streak-credit multiplier for verified completions.">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <FieldLabel>Challenge durations (min, comma-separated)</FieldLabel>
            <input
              value={durationsText}
              onChange={(e) => setDurationsText(e.target.value)}
              className="w-56 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:border-primary/40"
              placeholder="25, 50, 90"
            />
          </div>
          <NumField label="Reward multiplier (×10)" value={Math.round(cfg.rewardMultiplier * 10)} min={10} max={50}
            onChange={(v) => set("rewardMultiplier", v / 10)} />
          <p className="text-[10px] text-muted-foreground pb-2">
            Current: verified completion earns <span className="text-foreground font-medium">{cfg.rewardMultiplier}×</span> focus minutes.
          </p>
        </div>
      </Section>

      {/* ── Flagged sessions ── */}
      <Section icon={Flag} title="Flagged sessions" subtitle="Sessions the anti-gaming system marked for review (metadata only — no video ever exists).">
        {flaggedError ? (
          <p className="text-[11px] text-amber-400">
            Couldn't load flagged sessions ({flaggedError}). Make sure the <code className="text-[10px]">presence_sessions</code> table exists.
          </p>
        ) : flagged.length === 0 ? (
          <p className="text-xs text-muted-foreground">No flagged sessions. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Presence</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2">Reasons</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((s) => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(s.started_at).toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono text-[10px]">{s.user_id.slice(0, 8)}…</td>
                    <td className="py-2 pr-4 capitalize">{s.status}</td>
                    <td className="py-2 pr-4 tabular-nums">{Math.round(s.present_ratio * 100)}%</td>
                    <td className="py-2 pr-4 tabular-nums">{s.suspicion_score}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {(s.flag_reasons ?? []).map((r) => (
                          <span key={r} className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[9px]">
                            {r.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Small building blocks ────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children }: {
  icon: typeof Timer; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card-elevated border border-border p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{children}</p>;
}

function NumField({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:border-primary/40"
      />
    </div>
  );
}
