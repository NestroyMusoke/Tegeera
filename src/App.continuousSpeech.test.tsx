import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { getDefaultSpeechEngine } from "./speech/androidEngine";
import type { TestSpeechEngine } from "./speech/testEngine";

vi.mock("./speech/androidEngine", async () => {
  const { TestSpeechEngine } = await import("./speech/testEngine");
  const engine = new TestSpeechEngine();
  return { getDefaultSpeechEngine: () => engine };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { (getDefaultSpeechEngine() as TestSpeechEngine).calls.length = 0; });

it("offers device dictation without attempting unsupported browser recognition", async () => {
  const engine = getDefaultSpeechEngine() as TestSpeechEngine;
  vi.spyOn(engine, "initialize").mockResolvedValue({ supported: false, engine: "unsupported" });
  render(<App />);
  const button = await screen.findByRole("button", { name: "Use device dictation" });
  fireEvent.click(button);
  expect(document.activeElement).toBe(screen.getByLabelText("Your explanation"));
  expect(engine.calls).not.toContain("start");
  expect(screen.getByText(/Windows \+ H/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: "Draw a car" } });
  fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
  await waitFor(() => expect(screen.getByText("Revision 1")).toBeTruthy());
}, 20_000);

it("stops microphone capture when the page becomes hidden", async () => {
  const engine = getDefaultSpeechEngine() as TestSpeechEngine;
  render(<App />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Start listening" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Start listening" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Stop listening" })).toBeTruthy());
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  expect(engine.calls).toContain("cancel");
  expect(screen.getByRole("button", { name: "Start listening" })).toBeTruthy();
});

it("continues from one final phrase to another and preserves the speech record", async () => {
  const engine = getDefaultSpeechEngine() as TestSpeechEngine;
  const { container } = render(<App />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Start listening" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Start listening" }));
  await waitFor(() => expect(engine.calls).toContain("start"));
  await act(async () => { engine.emit({ type: "final", transcript: "Draw a car", confidence: .9 }); });
  await waitFor(() => expect(container.querySelectorAll(".doodle-object").length).toBeGreaterThan(0));
  await waitFor(() => expect(engine.calls.filter(call => call === "start")).toHaveLength(2));
  await act(async () => { engine.emit({ type: "final", transcript: "Draw a book", confidence: .9 }); });
  await waitFor(() => expect(screen.getByText("Recent speech (2 phrases)")).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Stop listening" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Start listening" })).toBeTruthy());
  expect(container.querySelector(".speech-transcript-log")?.textContent).toContain("Draw a car");
  expect(container.querySelector(".speech-transcript-log")?.textContent).toContain("Draw a book");
});
