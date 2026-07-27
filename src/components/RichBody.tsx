import type { ReactNode } from "react";

/** Lightweight markdown renderer shared by every reader modal: "## " headings, "- " bullets, plain paragraphs. */
export function RichBody({ body }: { body: string }) {
  const blocks = body.split("\n").filter((l) => l.trim().length > 0);
  const out: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={key} className="space-y-2 my-4">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-muted-foreground">
            <span className="text-primary shrink-0 mt-0.5">•</span>
            {b}
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  blocks.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flush(`u${i}`);
      out.push(
        <h3 key={i} className="font-display text-xl font-light mt-7 mb-2">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
    } else {
      flush(`u${i}`);
      out.push(
        <p key={i} className="text-[15px] leading-relaxed text-muted-foreground mb-4">
          {line}
        </p>
      );
    }
  });
  flush("last");

  return <div>{out}</div>;
}
