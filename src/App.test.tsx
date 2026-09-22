import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function explain(text: string) {
  fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
}

describe("teaching workflow", () => {
  it("shows instant unverified visual hints without mutating the accepted scene", () => {
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: "A dragon flies above a volcano" } });
    const hints = screen.getByRole("note", { name: "Unverified instant visual hints" });
    expect(hints.textContent).toContain("🐉");
    expect(hints.textContent).toContain("🌋");
    expect(hints.textContent).toContain("not the checked drawing");
    expect(container.querySelectorAll(".doodle-object")).toHaveLength(0);
    expect(screen.getByText("Revision 0")).toBeTruthy();
  });
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
  }, 15_000);

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
  it("reviews generated glyphs and reuses only approved artwork without refreshing", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
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
    expect(screen.getAllByRole("button", { name: "Keep this doodle" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Keep this doodle" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Do not reuse" }));
    expect(screen.queryByRole("button", { name: "Keep this doodle" })).toBeNull();
    await waitFor(() => expect((screen.getByRole("button", { name: "Draw it" }) as HTMLButtonElement).disabled).toBe(false));
    explain("A dragon flies over a tiny village");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(container.querySelectorAll('[data-glyph-source="cache"]')).toHaveLength(1), { timeout: 5_000 });
    expect(container.querySelectorAll('[data-glyph-source="generated"]')).toHaveLength(1);
    expect(container.querySelector('[data-visual-cue="semantic-connection"]')).not.toBeNull();
    expect(screen.getByText(/Scene model: example\/free-visual-model/)).toBeTruthy();
    expect(screen.queryByText("Help me understand")).toBeNull();
  }, 15_000);
  it("lets a newer AI explanation win even when the older response arrives last", async () => {
    let finishFirst!: (response: Response) => void;
    const first = new Promise<Response>((resolve) => { finishFirst = resolve; });
    const responseFor = (noun: string) => new Response(JSON.stringify({
      model: "example/free-visual-model",
      choices: [{ message: { content: JSON.stringify({
        blueprintVersion: "1.0", mode: "replace", confidence: 0.92,
        objects: [{ id: noun, label: noun, kind: "generic", x: 50, y: 50 }],
        connections: []
      }) } }]
    }), { status: 200, headers: { "content-type": "application/json" } });
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (!init?.method) return Promise.resolve(new Response("{}", { status: 200 }));
      return fetchMock.mock.calls.filter(([, options]) => options?.method).length === 1
        ? first : Promise.resolve(responseFor("volcano"));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText("OpenRouter key for this session"), { target: { value: "session-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Enable AI understanding" }));
    explain("A dragon flies over a tiny village");
    expect(screen.getByRole("button", { name: "Update drawing" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: "A volcano floats over a tiny castle" } });
    fireEvent.click(screen.getByRole("button", { name: "Update drawing" }));
    await waitFor(() => expect(container.querySelector('[data-entity-id="volcano"]')).not.toBeNull());
    await act(async () => { finishFirst(responseFor("dragon")); await first; });
    expect(screen.getByText("Revision 1")).toBeTruthy();
    expect(container.querySelector('[data-entity-id="dragon"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Draw it" })).toBeTruthy();
  }, 15_000);
  it("stops AI work without changing the current drawing", async () => {
    let finish!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { finish = resolve; });
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
      init?.method ? pending : Promise.resolve(new Response("{}", { status: 200 }))));
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText("OpenRouter key for this session"), { target: { value: "session-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Enable AI understanding" }));
    explain("Draw a car");
    const drawing = container.querySelector(".doodle-canvas")!.innerHTML;
    explain("A dragon flies over a tiny village");
    fireEvent.click(screen.getByRole("button", { name: "Stop AI" }));
    expect(screen.getByText("AI request stopped. The previous drawing is unchanged.")).toBeTruthy();
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(drawing);
    await act(async () => { finish(new Response("{}", { status: 200 })); await pending; });
    expect(screen.getByText("Revision 1")).toBeTruthy();
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(drawing);
  });
  it("does not replace a good drawing with an AI plan that omitted a relationship endpoint", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
      Promise.resolve(init?.method ? new Response(JSON.stringify({
        model: "example/free-visual-model",
        choices: [{ message: { content: JSON.stringify({
          blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
          objects: [{ id: "dragon", label: "dragon", kind: "generic", x: 50, y: 50 }],
          connections: [{ from: "dragon", to: "village", label: "flies over" }]
        }) } }]
      }), { status: 200 }) : new Response("{}", { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText("OpenRouter key for this session"), { target: { value: "session-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Enable AI understanding" }));
    explain("Draw a car");
    const drawing = container.querySelector(".doodle-canvas")!.innerHTML;
    explain("A dragon flies over a tiny village");
    await waitFor(() => expect(screen.getByText(/visual relationship referred to a missing or ambiguous object/i)).toBeTruthy());
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(drawing);
    expect(screen.getByText("Revision 1")).toBeTruthy();
  });
  it("asks for approval of a completed runtime doodle and removes a rejected draft", async () => {
    const strokeText = JSON.stringify({ strokes: [
      { part: "body", color: "#2f3e46", pts: [[10, 10], [40, 10], [40, 40], [10, 10]] },
      { part: "wing", color: "#e9c46a", pts: [[15, 25], [22, 12], [31, 24], [15, 25]] }
    ] });
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (!init?.method) return Promise.resolve(new Response("{}", { status: 200 }));
      const body = JSON.parse(init.body as string);
      if (body.stream) {
        const stream = new ReadableStream<Uint8Array>({ start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: strokeText } }] })}\n\n`));
          controller.close();
        } });
        return Promise.resolve(new Response(stream, { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        model: "example/free-visual-model",
        choices: [{ message: { content: JSON.stringify({
          blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
          objects: [{ id: "griffin", label: "griffin", kind: "generic", x: 50, y: 50 }], connections: []
        }) } }]
      }), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText("OpenRouter key for this session"), { target: { value: "session-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Enable AI understanding" }));
    explain("Illustrate a griffin with feathered wings");
    await waitFor(() => expect(screen.getByRole("region", { name: "Review generated doodles" })).toBeTruthy());
    expect(container.querySelector(".validated-glyph")).not.toBeNull();
    expect(container.querySelector('[data-glyph-source="deferred"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Do not reuse" }));
    await waitFor(() => expect(container.querySelector(".validated-glyph")).toBeNull());
    expect(container.querySelector('[data-glyph-source="sticker"]')).not.toBeNull();
  }, 15_000);
});
