import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Copy, Check } from "lucide-react";
import { renderClarityCard, canvasToBlob } from "@/lib/clarityCard";

interface ClarityShareCardProps {
  open: boolean;
  onClose: () => void;
  quote: string;
  glow: string;
  streakLabel?: string;
}

const SITE = "https://clarityhub.app";

export const ClarityShareCard = ({
  open,
  onClose,
  quote,
  glow,
  streakLabel,
}: ClarityShareCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    setRendering(true);
    renderClarityCard(canvasRef.current, { quote, glow, streakLabel }).finally(() =>
      setRendering(false)
    );
  }, [open, quote, glow, streakLabel]);

  const download = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clarity-hub-moment.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  const nativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (!blob) return;
    const file = new File([blob], "clarity-hub-moment.png", { type: "image/png" });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: "Today's Clarity",
          text: `"${quote}" — Clarity Hub`,
        });
        return;
      } catch {
        /* user cancelled — fall through to download */
      }
    }
    download();
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(`"${quote}" — Clarity Hub  ${SITE}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const shareText = encodeURIComponent(`"${quote}" — found my clarity today with @ClarityHub`);
  const socials = [
    { label: "WhatsApp", href: `https://wa.me/?text=${shareText}%20${encodeURIComponent(SITE)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(SITE)}` },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE)}`,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-md rounded-3xl bg-card-elevated border border-border p-5 shadow-elegant"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full glass grid place-items-center hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-3 text-center">
              Share your clarity
            </p>

            <div className="relative rounded-2xl overflow-hidden border border-border mx-auto" style={{ maxWidth: 340 }}>
              <canvas
                ref={canvasRef}
                className="w-full h-auto block"
                style={{ aspectRatio: "1080 / 1350" }}
              />
              {rendering && (
                <div className="absolute inset-0 grid place-items-center bg-background/40 text-xs text-muted-foreground">
                  Painting your card…
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                onClick={nativeShare}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-colors text-xs"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={download}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-secondary/50 text-foreground hover:bg-secondary transition-colors text-xs"
              >
                <Download className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={copyText}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-secondary/50 text-foreground hover:bg-secondary transition-colors text-xs"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full text-[11px] border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
              Tip: Save the image, then attach it to your Instagram story.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
