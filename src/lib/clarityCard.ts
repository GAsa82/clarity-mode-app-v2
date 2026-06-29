/**
 * Renders a beautiful, branded "Today's Clarity" share card onto a canvas.
 * 100% client-side — no server, no image API, no cost. Output is a 4:5 PNG
 * sized for Instagram / WhatsApp / X / LinkedIn.
 */

export interface ClarityCardOptions {
  quote: string;
  glow: string; // hsl(...) accent color
  streakLabel?: string;
}

const W = 1080;
const H = 1350;

/** turn `hsl(215 90% 50%)` into `hsl(215 90% 50% / a)` */
const withAlpha = (hsl: string, a: number) =>
  hsl.replace(/\)\s*$/, ` / ${a})`);

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const drawCompanion = (ctx: CanvasRenderingContext2D, cx: number, cy: number, glow: string) => {
  ctx.save();
  // aura
  const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 150);
  aura.addColorStop(0, withAlpha(glow, 0.5));
  aura.addColorStop(1, withAlpha(glow, 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.fill();

  // head
  ctx.shadowColor = withAlpha(glow, 0.6);
  ctx.shadowBlur = 40;
  const head = ctx.createRadialGradient(cx, cy - 12, 8, cx, cy, 78);
  head.addColorStop(0, "hsl(214 40% 32%)");
  head.addColorStop(1, "hsl(220 50% 15%)");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(cx, cy, 76, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = withAlpha(glow, 0.45);
  ctx.lineWidth = 2;
  ctx.stroke();

  // eyes
  ctx.fillStyle = "hsl(210 35% 94%)";
  for (const dx of [-26, 26]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy - 4, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "hsl(220 60% 14%)";
  for (const dx of [-26, 26]) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy - 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // gentle smile
  ctx.strokeStyle = "hsl(210 30% 92%)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy + 34);
  ctx.quadraticCurveTo(cx, cy + 56, cx + 28, cy + 34);
  ctx.stroke();
  ctx.restore();
};

export async function renderClarityCard(
  canvas: HTMLCanvasElement,
  opts: ClarityCardOptions
): Promise<void> {
  // make sure fonts are ready so the serif quote renders correctly
  try {
    await (document as any).fonts?.ready;
  } catch {
    /* ignore */
  }

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ---- background ----
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#070b16");
  bg.addColorStop(1, "#0a1220");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // top mood glow
  const topGlow = ctx.createRadialGradient(W * 0.5, H * 0.18, 40, W * 0.5, H * 0.18, 620);
  topGlow.addColorStop(0, withAlpha(opts.glow, 0.28));
  topGlow.addColorStop(1, withAlpha(opts.glow, 0));
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  // particles
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 2.4 + 0.6;
    ctx.fillStyle = withAlpha(opts.glow, Math.random() * 0.35 + 0.05);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // border frame
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // ---- companion ----
  drawCompanion(ctx, W / 2, 360, opts.glow);

  // ---- eyebrow ----
  ctx.textAlign = "center";
  ctx.fillStyle = withAlpha(opts.glow, 0.95);
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  try {
    (ctx as any).letterSpacing = "8px";
  } catch {
    /* older browsers */
  }
  ctx.fillText("TODAY'S CLARITY", W / 2, 540);
  try {
    (ctx as any).letterSpacing = "0px";
  } catch {
    /* ignore */
  }

  // ---- quote ----
  ctx.fillStyle = "#eef2f8";
  ctx.font = "italic 600 66px Georgia, 'Times New Roman', serif";
  const lines = wrapText(ctx, `"${opts.quote}"`, W - 220);
  const lineH = 92;
  const startY = 640 + (5 - Math.min(lines.length, 5)) * 18;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH));

  // ---- footer ----
  if (opts.streakLabel) {
    ctx.fillStyle = withAlpha(opts.glow, 0.85);
    ctx.font = "600 24px Inter, system-ui, sans-serif";
    ctx.fillText(`🔥 ${opts.streakLabel}`, W / 2, H - 230);
  }

  ctx.fillStyle = "#f4f7fb";
  ctx.font = "700 38px Inter, system-ui, sans-serif";
  ctx.fillText("Clarity Hub", W / 2, H - 150);

  ctx.fillStyle = "rgba(200,210,225,0.5)";
  ctx.font = "500 22px Inter, system-ui, sans-serif";
  const date = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  ctx.fillText(`Your companion for clarity  ·  ${date}`, W / 2, H - 110);
}

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
