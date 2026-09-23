import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it("draws an unfamiliar explanation through the hosted scene and glyph service without asking for a key", async () => {
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
  await waitFor(() => expect(container.querySelectorAll(".validated-glyph").length).toBeGreaterThan(0));
  expect(screen.getByRole("region", { name: "Review generated doodles" })).toBeTruthy();
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/v1/interpret"))).toBe(true);
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/v1/glyph"))).toBe(true);
}, 15_000);

it("does not mark a configured but unavailable host as connected", async () => {
  vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example");
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
  const { default: App } = await import("./App");
  const { container } = render(<App />);
  await waitFor(() => expect(screen.getByText(/Hosted AI is unavailable/)).toBeTruthy());
  expect(container.querySelector(".ai-connection-status")?.getAttribute("data-ai-enabled")).toBe("false");
  expect(screen.getByLabelText("Your explanation")).toBeTruthy();
});
