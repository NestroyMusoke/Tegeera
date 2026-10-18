import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it("replaces a contextual enclosure, undoes, and reuses the next plan without refreshing", async () => {
  vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example");
  vi.resetModules();
  const complex = "A cabinet contains a violin. A musician stands to the left of the cabinet and looks at the violin. A chair is to the right of the cabinet, and a clock is above it.";
  const next = "A camera rests beside a violin.";
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/health")) return new Response(JSON.stringify({ configured: true }));
    if (!url.endsWith("/v1/interpret")) throw new Error(`Unexpected request ${url}`);
    const text = JSON.parse(String(init?.body)).text;
    const candidate = text === complex ? {
      blueprintVersion: "1.0", mode: "replace", confidence: .95,
      objects: ["cabinet", "violin", "musician", "chair", "clock"].map((label, index) => ({
        id: `obj${index + 1}`, label, kind: label === "musician" ? "person" : "generic", x: 50, y: 50 })),
      connections: [{ from: "obj1", to: "obj2", kind: "contains", label: "contains" },
        { from: "obj3", to: "obj1", label: "left of" }, { from: "obj4", to: "obj1", label: "right of" },
        { from: "obj5", to: "obj1", label: "above" }, { from: "obj3", to: "obj2", label: "looks at" }]
    } : {
      blueprintVersion: "1.0", mode: "replace", confidence: .95,
      objects: [{ id: "camera", label: "camera", kind: "generic", x: 25, y: 50 },
        { id: "violin", label: "violin", kind: "generic", x: 75, y: 50 }],
      connections: [{ from: "camera", to: "violin", label: "beside" }]
    };
    return new Response(JSON.stringify({ provider: "nebius", candidate }));
  });
  vi.stubGlobal("fetch", fetchMock);
  const { default: App } = await import("./App");
  const { container } = render(<App />);
  const submit = (text: string) => {
    fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
  };
  submit(complex);
  await waitFor(() => expect(screen.getByText("Revision 1")).toBeTruthy());
  expect(container.querySelector('[data-layout-topology="nested-container"]')).not.toBeNull();
  const original = container.querySelector(".doodle-canvas")!.innerHTML;
  submit(next);
  await waitFor(() => expect(screen.getByText("Revision 2")).toBeTruthy());
  expect(container.querySelector('[data-layout-topology="nested-container"]')).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(original);
  submit(next);
  await waitFor(() => expect(screen.getByText("Reused a previously accepted visual plan")).toBeTruthy());
  expect(container.querySelector('[data-layout-topology="nested-container"]')).toBeNull();
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/v1/interpret"))).toHaveLength(2);
}, 20_000);
