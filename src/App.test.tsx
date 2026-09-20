import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function explain(text: string) {
  fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
}

describe("teaching workflow", () => {
  it("completes the CPU queue golden workflow through the real form", () => {
    const { container } = render(<App />);
    explain("Imagine three processes waiting in a CPU queue");
    explain("Make that four processes");
    explain("Move the CPU to the right");
    explain("What if the second process goes first");
    expect(container.querySelectorAll('[data-entity-id^="process-"]')).toHaveLength(4);
    expect(container.querySelector('[data-entity-id="cpu-1"]')).not.toBeNull();
    expect(container.querySelector(".queue-annotation")?.getAttribute("aria-label")).toContain("process 2, process 1");
    expect(screen.getByText("Revision 4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(container.querySelector(".queue-annotation")?.getAttribute("aria-label")).toContain("process 1, process 2");
  }, 10_000);
  it("accepts a polite classroom paraphrase but preserves the scene for polite negation", () => {
    const { container } = render(<App />);
    explain("Could you please show me three students sharing two books?");
    expect(container.querySelectorAll(".doodle-object")).toHaveLength(5);
    expect(container.querySelector(".relationship-key")?.textContent).toContain("share");
    const scene = container.querySelector(".doodle-canvas")!.innerHTML;
    explain("Could you not clear everything");
    expect(screen.getByText("Help me understand")).toBeTruthy();
    expect(container.querySelector('[data-clarification-code="negated-claim"]')).not.toBeNull();
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(scene);
  });
  it("changes view without changing scene revision or consuming Undo", () => {
    const { container } = render(<App />);
    expect((screen.getByRole("button", { name: "Read details" }) as HTMLButtonElement).disabled).toBe(true);
    explain("Three students each have a book");
    const drawing = container.querySelector(".doodle-canvas")!.innerHTML;
    fireEvent.click(screen.getByRole("button", { name: "Read details" }));
    expect(screen.getByRole("region", { name: "Scrollable drawing detail" }).tabIndex).toBe(0);
    expect(screen.getByRole("button", { name: "Read details" }).getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(drawing);
    expect(screen.getByText("Revision 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    expect(container.querySelector(".is-detail")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(container.querySelectorAll(".doodle-object")).toHaveLength(0);
  });
  it("keeps controls before ownership details in reading and tab order", async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Typed input ready")).toBeTruthy());
    explain("Three students each have two books");
    expect(container.querySelectorAll(".ownership-card")).toHaveLength(3);
    const controls = container.querySelector(".control-card")!;
    const details = container.querySelector(".ownership-details")!;
    expect(controls.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".canvas-shell .control-card")).toBeNull();
    expect((screen.getByLabelText("Your explanation") as HTMLInputElement).value).toBe("");
  });
  it("transfers, undoes and rejects unsupported input through the real form", () => {
    const { container } = render(<App />);
    explain("Three students each have a book");
    explain("The first student gives book 1 to the second student");
    expect(container.querySelectorAll('[data-owner-id="student-2"] [data-owned-id]')).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(container.querySelectorAll('[data-owner-id="student-1"] [data-owned-id]')).toHaveLength(1);
    const scene = container.querySelector(".doodle-canvas")!.innerHTML;
    explain("A dragon eats the books");
    expect(screen.getByText("Help me understand")).toBeTruthy();
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(scene);
    expect((screen.getByLabelText("Your explanation") as HTMLInputElement).value).toBe("A dragon eats the books");
    explain("Clear everything");
    expect(container.querySelectorAll(".ownership-card")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(container.querySelectorAll(".ownership-card")).toHaveLength(3);
  });

  it("holds a live scene without changing revision or consuming Undo", () => {
    const { container } = render(<App />);
    explain("Draw a car");
    const drawing = container.querySelector(".doodle-canvas")!.innerHTML;
    expect(screen.getByText("Revision 1")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(false);

    explain("Let's take a short break before we continue");
    expect(screen.getByText("Scene held")).toBeTruthy();
    expect(container.querySelector('[data-hold-reason="non-visual-speech"]')).not.toBeNull();
    expect(container.querySelector(".clarification")).toBeNull();
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(drawing);
    expect(screen.getByText("Revision 1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(container.querySelectorAll(".doodle-object")).toHaveLength(0);
    expect(screen.getByText("Revision 0")).toBeTruthy();
  });

  it("records decision-to-painted-frame evidence through the real form", async () => {
    const { container } = render(<App />);
    explain("Draw a car");
    await waitFor(() => expect(container.querySelector('.latency-panel output')).not.toBeNull());
    const evidence = container.querySelector('.latency-panel output')!;
    expect(evidence.getAttribute("data-input-source")).toBe("typed");
    expect(evidence.getAttribute("data-outcome")).toBe("draw");
    expect(Number(evidence.getAttribute("data-decision-ms"))).toBeGreaterThanOrEqual(0);
    expect(Number(evidence.getAttribute("data-paint-ms"))).toBeGreaterThanOrEqual(Number(evidence.getAttribute("data-commit-ms")));
    expect(evidence.textContent).toContain("painted");
  });
  it("enables a privacy-labelled performance export only after evidence exists", async () => {
    render(<App />);
    const download = screen.getByRole("button", { name: "Download performance evidence" }) as HTMLButtonElement;
    expect(download.disabled).toBe(true);
    expect(screen.getByText(/never lesson text or transcripts/i)).toBeTruthy();
    explain("A light ray travels toward a mirror and reflects off it");
    await waitFor(() => expect(download.disabled).toBe(false));
  });
  it("replaces one demonstration with another without a page refresh", () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "A light ray travels toward a mirror and reflects off it." })[0]);
    expect(container.querySelector('[data-visual-cue="straight-incident-ray"]')).not.toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "In a stack, you push and pop items only at the top." })[0]);
    expect(container.querySelector(".lifo-stack-annotation")).not.toBeNull();
    expect(container.querySelector('[data-visual-cue="straight-incident-ray"]')).toBeNull();
    expect(screen.getByText("Revision 1")).toBeTruthy();
  });
  it("turns unfamiliar language into a validated procedural scene when session AI is enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "example/free-visual-model",
      choices: [{ message: { content: JSON.stringify({
        blueprintVersion: "1.0", mode: "replace", confidence: 0.92,
        objects: [
          { id: "dragon", label: "flying dragon", kind: "generic", color: "green", x: 20, y: 35, glyph: {
            schemaVersion: "1.0.0", viewBox: "0 0 100 100",
            parts: [
              { id: "body", d: "M20 58 C25 34 59 32 73 48 C80 59 69 76 48 77 C31 77 22 69 20 58 Z", fill: "#84a98c", stroke: "#2f3e46" },
              { id: "wing", d: "M48 44 Q38 12 18 20 Q30 40 48 59 Z", fill: "#e9c46a", stroke: "#2f3e46" }
            ], anchors: { top: [38, 20], ground: [48, 77], front: [73, 48] }
          } },
          { id: "village", label: "tiny village", kind: "generic", x: 80, y: 68, glyph: {
            schemaVersion: "1.0.0", viewBox: "0 0 100 100",
            parts: [
              { id: "house", d: "M22 48 L78 48 L78 88 L22 88 Z", fill: "#cad2c5", stroke: "#2f3e46" },
              { id: "roof", d: "M15 50 L50 20 L85 50 Z", fill: "#f4a261", stroke: "#2f3e46" }
            ], anchors: { top: [50, 20], ground: [50, 88], front: [78, 68] }
          } }
        ], connections: [{ from: "dragon", to: "village", label: "flies over" }]
      }) } }]
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText("OpenRouter key for this session"), { target: { value: "session-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Enable AI understanding" }));
    explain("A dragon flies over a tiny village");
    await waitFor(() => expect(container.querySelectorAll(".validated-glyph")).toHaveLength(2));
    expect(container.querySelectorAll('[data-glyph-source="generated"]')).toHaveLength(2);
    expect(container.querySelector('[data-visual-cue="semantic-connection"]')).not.toBeNull();
    expect(screen.getByText(/Last model: example\/free-visual-model/)).toBeTruthy();
    expect(screen.queryByText("Help me understand")).toBeNull();
  });
});
