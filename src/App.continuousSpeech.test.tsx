import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";
import { getDefaultSpeechEngine } from "./speech/androidEngine";
import type { TestSpeechEngine } from "./speech/testEngine";

vi.mock("./speech/androidEngine", async () => {
  const { TestSpeechEngine } = await import("./speech/testEngine");
  const engine = new TestSpeechEngine();
  return { getDefaultSpeechEngine: () => engine };
});
afterEach(() => cleanup());

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
