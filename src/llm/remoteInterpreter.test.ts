import { describe, expect, it, vi } from "vitest";

describe("remote interpreter boundary", () => {
  it("stays disabled when no public backend URL was supplied", async () => {
    vi.resetModules();
    const remote = await import("./remoteInterpreter");
    expect(remote.remoteInterpreterEnabled()).toBe(false);
  });
});
