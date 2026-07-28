import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RichBody } from "./RichBody";

describe("RichBody", () => {
  it("renders a plain paragraph", () => {
    render(<RichBody body="Just a sentence." />);
    expect(screen.getByText("Just a sentence.")).toBeInTheDocument();
  });

  it("renders multiple paragraphs as separate <p> elements", () => {
    const { container } = render(<RichBody body={"First paragraph.\nSecond paragraph."} />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("renders a '## ' line as a heading, stripping the marker", () => {
    render(<RichBody body="## Key takeaways" />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Key takeaways");
  });

  it("groups consecutive '- ' lines into a single list", () => {
    const { container } = render(<RichBody body={"- First\n- Second\n- Third"} />);
    expect(container.querySelectorAll("ul")).toHaveLength(1);
    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
  });

  it("closes the current list when a non-bullet line follows — this is the actual bug class this component exists to avoid: a naive parser could merge two unrelated lists separated by a paragraph into one", () => {
    const { container } = render(<RichBody body={"- A\n- B\nA paragraph in between.\n- C\n- D"} />);
    const lists = container.querySelectorAll("ul");
    expect(lists).toHaveLength(2);
    expect(lists[0].querySelectorAll("li")).toHaveLength(2);
    expect(lists[1].querySelectorAll("li")).toHaveLength(2);
  });

  it("flushes a trailing list even when the body ends on a bullet line — the actual production content this renders (diary-pipeline output) always ends with 'Questions to sit with' as a bullet list", () => {
    const { container } = render(<RichBody body={"## Questions\n- What matters here?\n- What would I do differently?"} />);
    const lists = container.querySelectorAll("ul");
    expect(lists).toHaveLength(1);
    expect(lists[0].querySelectorAll("li")).toHaveLength(2);
  });

  it("ignores blank lines rather than rendering empty paragraphs", () => {
    const { container } = render(<RichBody body={"First.\n\n\nSecond."} />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("renders a realistic mixed body (heading, paragraph, list, heading, list) in document order", () => {
    const body = [
      "## How to apply this",
      "Start small and build from there.",
      "- Pick one habit",
      "- Track it daily",
      "## Practice",
      "- Try this today",
    ].join("\n");
    const { container } = render(<RichBody body={body} />);
    const children = Array.from(container.firstElementChild!.children).map((el) => el.tagName);
    expect(children).toEqual(["H3", "P", "UL", "H3", "UL"]);
  });
});
