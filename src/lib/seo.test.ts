import { describe, it, expect } from "vitest";
import { excerpt } from "./seo";

describe("excerpt", () => {
  it("returns short text unchanged", () => {
    expect(excerpt("A short piece.")).toBe("A short piece.");
  });

  it("strips '## ' heading markers so they don't leak into a meta description", () => {
    expect(excerpt("## Key takeaways\nSome real content here.")).toBe(
      "Key takeaways Some real content here."
    );
  });

  it("collapses newlines and repeated whitespace into single spaces", () => {
    expect(excerpt("Line one.\n\nLine   two.")).toBe("Line one. Line two.");
  });

  it("truncates long text to the max length and appends an ellipsis", () => {
    const long = "word ".repeat(50).trim();
    const result = excerpt(long, 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.endsWith("…")).toBe(true);
  });

  it("does not cut off mid-truncation with trailing whitespace before the ellipsis", () => {
    // 19 chars then a space then more text — the naive slice(0, 19) would
    // land exactly on that space, which trimEnd() must clean up before
    // the ellipsis so it doesn't read "...word …" with a dangling gap.
    const result = excerpt("This is exactly nineteen chars then more", 20);
    expect(result).not.toMatch(/\s…$/);
  });

  it("respects a custom max length", () => {
    expect(excerpt("exactly ten", 10).length).toBeLessThanOrEqual(10);
  });
});
