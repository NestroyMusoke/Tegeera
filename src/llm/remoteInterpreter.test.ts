import { describe, expect, it, vi } from "vitest";
import { initialScene } from "../doodlescript/scene";

describe("remote interpreter boundary", () => {
  it("stays disabled when no public backend URL was supplied", async () => {
    vi.resetModules();
    const remote = await import("./remoteInterpreter");
    expect(remote.remoteInterpreterEnabled()).toBe(false);
  });

  it("uses a session key immediately and reports the model OpenRouter selected", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "example/free-model",
      choices: [{ message: { content: JSON.stringify({ schemaVersion: "2.25.0" }) } }]
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const remote = await import("./remoteInterpreter");
    expect(remote.remoteInterpreterEnabled("session-key")).toBe(true);
    const result = await remote.interpretRemotely("Draw a book", initialScene, "session-key");
    expect(result.model).toBe("example/free-model");
    expect(fetchMock).toHaveBeenCalledWith("https://openrouter.ai/api/v1/chat/completions", expect.objectContaining({
      headers: expect.objectContaining({ authorization: "Bearer session-key" })
    }));
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.models).toEqual(["google/gemma-4-26b-a4b-it:free", "google/gemma-4-31b-it:free", "openrouter/free"]);
    expect(body.reasoning).toEqual({ enabled: false });
    expect(body.messages[0].content).toContain('"blueprintVersion":"1.0"');
    expect(body.messages[0].content).toContain("Do not emit glyphs");
    expect(body.messages[0].content).toContain("essential visible part, input, output, source");
    expect(body.messages[0].content).toContain("Never reference an omitted object");
    expect(body.max_tokens).toBe(3600);
    vi.unstubAllGlobals();
  });

  it("uses the private local bridge without sending a browser credential", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "example/free-model", choices: [{ message: { content: '{"blueprintVersion":"1.0"}' } }]
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const remote = await import("./remoteInterpreter");
    expect(remote.remoteInterpreterEnabled("", true)).toBe(true);
    await remote.interpretRemotely("Draw a book", initialScene, "", undefined, [], true);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/tegeera-ai/chat/completions");
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
