import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it("does not mark a configured but unavailable host as connected", async () => {
  vi.stubEnv("VITE_TEGEERA_INTERPRETER_URL", "https://tegeera.example");
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
  const { default: App } = await import("./App");
  const { container } = render(<App />);
  await waitFor(() => expect(screen.getByText(/Hosted AI is unavailable/)).toBeTruthy());
  expect(container.querySelector(".ai-connection-status")?.getAttribute("data-ai-enabled")).toBe("false");
  expect(screen.getByLabelText("Your explanation")).toBeTruthy();
}, 15_000);
