import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it.each(["typing", "undo"])("protects the user's next action (%s) from a late hosted response", async (action) => {
  vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example");
  vi.resetModules();
  let finish!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => { finish = resolve; });
  let requestSignal: AbortSignal | undefined;
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith("/health")) return Promise.resolve(new Response(JSON.stringify({ configured: true })));
    if (url.endsWith("/v1/interpret")) { requestSignal = init?.signal as AbortSignal; return pending; }
    throw new Error(`Unexpected request ${url}`);
  }));
  const { default: App } = await import("./App");
  const { container } = render(<App />);
  const input = screen.getByLabelText("Your explanation") as HTMLInputElement;
  const submit = (text: string) => {
    fireEvent.change(input, { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
  };
  submit("Draw a car");
  submit("A camera rests beside a violin.");
  expect(screen.getByRole("button", { name: "Stop AI" })).toBeTruthy();
  const draft = "A yellow umbrella stands beside a suitcase.";
  if (action === "typing") fireEvent.change(input, { target: { value: draft } });
  else fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  await act(async () => {
    finish(new Response(JSON.stringify({ provider: "nebius", candidate: {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.95,
      objects: [{ id: "camera", label: "camera", kind: "generic", x: 25, y: 50 },
        { id: "violin", label: "violin", kind: "generic", x: 75, y: 50 }],
      connections: [{ from: "camera", to: "violin", label: "beside" }]
    } })));
    await pending;
  });
  if (action === "typing") {
    await waitFor(() => expect(screen.getByText("Revision 2")).toBeTruthy());
    expect(input.value).toBe(draft);
  } else {
    expect(requestSignal?.aborted).toBe(true);
    expect(screen.getByText("Revision 0")).toBeTruthy();
    expect(container.querySelectorAll(".doodle-object")).toHaveLength(0);
  }
  expect(screen.queryByRole("button", { name: "Stop AI" })).toBeNull();
}, 20_000);

it("draws a hosted propagation diagram, replays after Undo, and preserves it on a malformed follow-up", async () => {
  vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example");
  vi.resetModules();
  let malformed = false;
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/health")) return new Response(JSON.stringify({ configured: true, provider: "nebius", model: "test" }));
    if (url.endsWith("/v1/interpret")) return new Response(JSON.stringify({ provider: "nebius", model: "test", candidate: {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.9,
      objects: ["transducer", "gel", "ultrasound", "sensor"].map((label, index) => ({ id: `r${index}`, label, kind: "generic", x: 10 + index * 25, y: 50 })),
      connections: [{ from: "r0", to: "r2", label: "emits", kind: "emits" },
        { from: "r2", to: "r1", label: "propagates through", kind: "propagatesThrough" },
        { from: malformed ? "r1" : "r2", to: "r3", label: "reaches", kind: "reaches" }]
    } }));
    throw new Error(`Unexpected request ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const { default: App } = await import("./App");
  const { container } = render(<App />);
  const explain = (text: string) => {
    fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
  };
  const statement = "The transducer sends ultrasound across the gel to the sensor.";
  explain(statement);
  await waitFor(() => expect(screen.getByText("Revision 1")).toBeTruthy());
  expect(container.querySelectorAll("[data-propagation-role]")).toHaveLength(4);
  expect(container.querySelector('[data-visual-cue="linear-medium"]')).not.toBeNull();
  const before = container.querySelector(".doodle-canvas")!.innerHTML;
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  explain(statement);
  await waitFor(() => expect(screen.getByText("Reused a previously accepted visual plan")).toBeTruthy());
  expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(before);
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/v1/interpret"))).toHaveLength(1);
  // A repeated standalone explanation should not spend another call just
  // because the previous drawing is still on the canvas.
  explain(statement);
  await waitFor(() => expect(screen.getByText("Revision 2")).toBeTruthy());
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/v1/interpret"))).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(before);
  malformed = true;
  explain("The transducer now sends ultrasound across the gel to the sensor.");
  await waitFor(() => expect(screen.getByText(/reaches must start at the travelling payload/)).toBeTruthy());
  expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(before);
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/v1/glyph"))).toBe(false);
}, 20_000);

it("draws model-screened provisional nature sketches immediately without a glyph API call", async () => {
  vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example");
  vi.resetModules();
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/health")) return new Response(JSON.stringify({ configured: true,
      provider: "nebius", model: "test" }), { status: 200 });
    if (url.endsWith("/v1/interpret")) return new Response(JSON.stringify({ provider: "nebius",
      model: "test", candidate: { blueprintVersion: "1.0", mode: "replace", confidence: 0.93,
        objects: [{ id: "a", label: "second bee", kind: "person", x: 25, y: 45 },
          { id: "b", label: "flower", kind: "generic", x: 75, y: 45 }],
        connections: [{ from: "a", to: "b", label: "visits" }] } }), { status: 200 });
    throw new Error(`Unexpected request ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const { default: App } = await import("./App");
  const { container } = render(<App />);
  fireEvent.change(screen.getByLabelText("Your explanation"),
    { target: { value: "A second bee visits a flower." } });
  fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
  await waitFor(() => expect(screen.getByText("Revision 1")).toBeTruthy());
  expect(container.querySelectorAll('[data-glyph-source="provisional"]')).toHaveLength(2);
  expect(screen.getByText("2 provisional sketches · not human-reviewed")).toBeTruthy();
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/v1/glyph"))).toBe(false);
}, 20_000);

it("draws a hosted explanation but preserves it when follow-up plans lose negation or colour", async () => {
  vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example");
  vi.resetModules();
  const strokes = { strokes: [{ part: "outline", color: "#2f3e46", pts: [[10, 10], [40, 10], [40, 40], [10, 10]] }] };
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/health")) return new Response(JSON.stringify({ configured: true, provider: "nvidia", model: "nvidia/test" }), { status: 200 });
    if (url.endsWith("/v1/glyph")) return new Response(JSON.stringify({ candidate: strokes }), { status: 200 });
    if (url.endsWith("/v1/interpret")) return new Response(JSON.stringify({ provider: "nvidia", model: "nvidia/test", candidate: {
      blueprintVersion: "1.0", mode: "replace", confidence: 0.91,
      objects: [
        { id: "dragon", label: "dragon", kind: "generic", x: 25, y: 25 },
        { id: "village", label: "village", kind: "generic", x: 75, y: 75 }
      ], connections: [{ from: "dragon", to: "village", label: "flies above" }]
    } }), { status: 200 });
    throw new Error(`Unexpected request ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const { default: App } = await import("./App");
  const { container } = render(<App />);
  expect(screen.queryByLabelText("OpenRouter key for this session")).toBeNull();
  fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: "A dragon flies above a tiny village" } });
  fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
  await waitFor(() => expect(screen.getByText("Revision 1")).toBeTruthy());
  await waitFor(() => expect(screen.getByRole("region", { name: "Review generated doodles" })).toBeTruthy());
  expect(container.querySelectorAll(".validated-glyph")).toHaveLength(0);
  expect(container.querySelector('[data-symbol-id="emoji-preview"]')).not.toBeNull();
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/v1/interpret"))).toBe(true);
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/v1/glyph"))).toBe(true);
  const original = container.querySelector(".doodle-canvas")?.getAttribute("aria-label");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() => expect(screen.getByText("Revision 0")).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: "A dragon flies above a tiny village" } });
  fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
  await waitFor(() => expect(screen.getByText("Revision 1")).toBeTruthy());
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/v1/interpret"))).toHaveLength(1);
  expect(screen.getByText("Reused a previously accepted visual plan")).toBeTruthy();
  const explain = (text: string) => {
    fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
  };
  explain("A dragon does not fly over a village");
  await waitFor(() => expect(screen.getByText(/negated claim/)).toBeTruthy());
  expect(screen.getByText("Revision 1")).toBeTruthy();
  expect(container.querySelector(".doodle-canvas")?.getAttribute("aria-label")).toBe(original);
  explain("A yellow zeppelin hovers above the city");
  await waitFor(() => expect(screen.getByText(/omitted the stated yellow colour/)).toBeTruthy());
  expect(screen.getByText("Revision 1")).toBeTruthy();
  expect(container.querySelector(".doodle-canvas")?.getAttribute("aria-label")).toBe(original);
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/v1/interpret"))).toHaveLength(3);
}, 20_000);
