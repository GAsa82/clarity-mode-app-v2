import type { NetworkQuality } from "@/lib/webrtc-service";

interface Props {
  quality: NetworkQuality;
}

const CONFIG: Record<NetworkQuality, { bars: number; color: string; label: string }> = {
  excellent: { bars: 4, color: "bg-green-400",  label: "Excellent" },
  good:      { bars: 3, color: "bg-green-400",  label: "Good" },
  fair:      { bars: 2, color: "bg-yellow-400", label: "Fair" },
  poor:      { bars: 1, color: "bg-red-400",    label: "Poor" },
  unknown:   { bars: 0, color: "bg-border",     label: "—" },
};

export function NetworkQualityIndicator({ quality }: Props) {
  const { bars, color, label } = CONFIG[quality];

  return (
    <div className="flex items-center gap-1.5" title={`Connection: ${label}`}>
      <div className="flex items-end gap-0.5 h-3.5">
        {[1, 2, 3, 4].map(b => (
          <div
            key={b}
            className={`w-1 rounded-sm transition-all ${b <= bars ? color : "bg-border"}`}
            style={{ height: `${b * 25}%` }}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground hidden sm:block">{label}</span>
    </div>
  );
}
