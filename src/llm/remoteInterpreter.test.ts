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
    expect(body.messages[0].content).toContain('"blueprintVersion":"1.0"');
    expect(body.messages[0].content).toContain("Every generic object needs one glyph");
    expect(body.messages[0].content).toContain("uppercase M L C Q Z only");
    expect(body.max_tokens).toBe(3600);
    vi.unstubAllGlobals();
  });
});
