/**
 * Premium thumbnail generation, in the browser.
 *
 * Rendering these server-side would mean either a paid image API or shipping a
 * font engine (satori/resvg) into a serverless bundle. The admin's browser
 * already has real font rasterisation, so it draws them instead — genuine
 * PNG/WebP/JPEG at every size, no extra service, no extra cost.
 *
 * House style: dark, minimal, generous whitespace, one accent. No stock
 * imagery, no gradients-for-the-sake-of-it, no clip art.
 */

export type ThumbSize = { key: string; w: number; h: number };

export const THUMB_SIZES: ThumbSize[] = [
  { key: "1200x630", w: 1200, h: 630 }, // OpenGraph / Twitter / blog banner
  { key: "800x800", w: 800, h: 800 },   // Instagram / Pinterest square
  { key: "512x512", w: 512, h: 512 },   // compact card / avatar-ish
];

export type ThumbFormat = { ext: "png" | "webp" | "jpeg"; mime: string; quality?: number };

export const THUMB_FORMATS: ThumbFormat[] = [
  { ext: "webp", mime: "image/webp", quality: 0.92 }, // preferred: smallest
  { ext: "png", mime: "image/png" },                  // lossless fallback
  { ext: "jpeg", mime: "image/jpeg", quality: 0.9 },  // universal compatibility
];

/** Accent per category so the library reads as a coherent set, not noise. */
const ACCENTS: Record<string, string> = {
  psychology: "#8b5cf6",
  business: "#22d3ee",
  productivity: "#38bdf8",
  mindset: "#a78bfa",
  self_improvement: "#34d399",
  finance: "#fbbf24",
  health: "#4ade80",
  technology: "#60a5fa",
  life: "#f472b6",
  relationships: "#fb7185",
  diary: "#6366f1",
};

export type ThumbInput = {
  title: string;
  topics?: string[];
  category?: string;
  kicker?: string;
};

/** Greedy wrap that also caps line count, appending an ellipsis if it overflows. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length === maxLines) {
    // Trim the last line until the ellipsis fits.
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function drawThumb(canvas: HTMLCanvasElement, size: ThumbSize, input: ThumbInput) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");

  const { w, h } = size;
  canvas.width = w;
  canvas.height = h;
  const accent = ACCENTS[input.category ?? "diary"] ?? ACCENTS.diary;
  // Scale every measurement off the short edge so all three sizes look like
  // the same design rather than a squashed copy of one.
  const u = Math.min(w, h) / 100;

  // Base
  ctx.fillStyle = "#080b12";
  ctx.fillRect(0, 0, w, h);

  // A single soft accent bloom, off-centre.
  const bloom = ctx.createRadialGradient(w * 0.78, h * 0.18, 0, w * 0.78, h * 0.18, Math.max(w, h) * 0.75);
  bloom.addColorStop(0, `${accent}2E`);
  bloom.addColorStop(0.55, `${accent}0A`);
  bloom.addColorStop(1, "#080b1200");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  // Bottom vignette keeps text legible over the bloom.
  const vignette = ctx.createLinearGradient(0, h * 0.35, 0, h);
  vignette.addColorStop(0, "#080b1200");
  vignette.addColorStop(1, "#080b12E6");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const padX = u * 9;
  let y = h - u * 9;

  // Topics along the bottom, quietest element.
  const topics = (input.topics ?? []).slice(0, 3);
  if (topics.length) {
    ctx.font = `500 ${u * 3.1}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = "alphabetic";
    let x = padX;
    for (const topic of topics) {
      const label = topic.toUpperCase();
      const tw = ctx.measureText(label).width;
      const chipW = tw + u * 5;
      const chipH = u * 6.4;
      if (x + chipW > w - padX) break;

      ctx.fillStyle = "#ffffff0F";
      roundRect(ctx, x, y - chipH + u * 1.6, chipW, chipH, chipH / 2);
      ctx.fill();
      ctx.fillStyle = "#ffffffB3";
      ctx.fillText(label, x + u * 2.5, y - u * 0.9);
      x += chipW + u * 2;
    }
    y -= u * 11;
  }

  // Title — the hero. Serif for warmth; this is a diary, not a SaaS dashboard.
  const titleSize = size.key === "1200x630" ? u * 9.2 : u * 8.4;
  ctx.font = `300 ${titleSize}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = "#F5F7FA";
  ctx.textBaseline = "alphabetic";

  const maxLines = size.key === "1200x630" ? 3 : 4;
  const lines = wrap(ctx, input.title, w - padX * 2, maxLines);
  const lineHeight = titleSize * 1.22;

  // Draw upward from the baseline so the block always sits above the topics.
  let ty = y;
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], padX, ty);
    ty -= lineHeight;
  }

  // Kicker above the title.
  const kicker = (input.kicker ?? "badly talks").toUpperCase();
  ctx.font = `600 ${u * 3.2}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = accent;
  ctx.letterSpacing = `${u * 0.5}px`;
  ctx.fillText(kicker, padX, ty - u * 2.2);
  ctx.letterSpacing = "0px";

  // Accent rule, top-left — the one piece of decoration.
  ctx.fillStyle = accent;
  roundRect(ctx, padX, u * 9, u * 12, u * 0.9, u * 0.45);
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export type RenderedThumb = { key: string; ext: string; mime: string; blob: Blob };

/** Render every size × format combination. */
export async function renderThumbnails(input: ThumbInput): Promise<RenderedThumb[]> {
  // Without this the first render can use a fallback face and look wrong.
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement("canvas");
  const out: RenderedThumb[] = [];

  for (const size of THUMB_SIZES) {
    drawThumb(canvas, size, input);
    for (const fmt of THUMB_FORMATS) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, fmt.mime, fmt.quality)
      );
      // Older browsers silently refuse WebP encoding — skip rather than fail
      // the whole pipeline over a format we have two fallbacks for.
      if (blob) out.push({ key: size.key, ext: fmt.ext, mime: fmt.mime, blob });
    }
  }
  return out;
}
