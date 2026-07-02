import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Cpu, Eye, ShieldCheck, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { setPresenceConsent } from "@/lib/presence-verification";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: () => void;
};

const points = [
  {
    icon: Cpu,
    title: "Everything runs on your device",
    text: "Face and motion detection happen locally in your browser. Video frames are analysed in memory and immediately discarded.",
  },
  {
    icon: Trash2,
    title: "Nothing is recorded",
    text: "No video, no photos, no audio — ever. Only session facts are kept (start time, duration, presence status).",
  },
  {
    icon: Eye,
    title: "How verification works",
    text: "We check that a person is in frame using face detection, tolerate normal movement (stretching, standing) via body-presence detection, and occasionally ask for a quick tap to confirm focus.",
  },
  {
    icon: Timer,
    title: "Fair by design",
    text: "Short breaks are fine. You'll always see a warning and a grace-period countdown before a challenge can fail — never a surprise.",
  },
];

export const PresenceConsentDialog = ({ open, onOpenChange, onConsent }: Props) => {
  const [agreeing, setAgreeing] = useState(false);

  const handleAgree = () => {
    setAgreeing(true);
    setPresenceConsent(true);
    onConsent();
    onOpenChange(false);
    setAgreeing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="font-display text-xl font-light">
            Presence Verification
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Deep Work Challenges use your camera to verify you're actually present —
            that's what makes completing one meaningful. Here's exactly what happens:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          {points.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50"
            >
              <p.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium mb-0.5">{p.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{p.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          You can revoke consent anytime by leaving the challenge — the camera stops
          instantly. Sessions flagged by the fairness system are reviewed using
          metadata only.
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="glass" size="sm" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button variant="hero" size="sm" onClick={handleAgree} disabled={agreeing}>
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            I understand — enable camera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
