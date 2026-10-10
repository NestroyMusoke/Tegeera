import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const explain = (text: string) => {
  fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
};
const heat = "When you heat a metal rod at one end, the heat slowly moves along to the other end.";
const signal = "A signal travels through a cable from a transmitter to a receiver.";
const wave = "A wave propagates along a spring from a shaker to a clamp.";

describe("successive offline propagation explanations", () => {
  it("draws three explanations without refresh or API calls and restores each with Undo", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<App />);
    const canvas = () => container.querySelector(".doodle-canvas")!;
    explain(heat);
    expect(screen.getByText("Revision 1")).toBeTruthy();
    expect(canvas().textContent).toContain("metal rod");
    explain(signal);
    expect(screen.getByText("Revision 2")).toBeTruthy();
    expect(canvas().textContent).toContain("cable");
    expect(canvas().textContent).not.toContain("metal rod");
    explain(wave);
    expect(screen.getByText("Revision 3")).toBeTruthy();
    expect(canvas().textContent).toContain("spring");
    expect(container.querySelectorAll("[data-propagation-role]")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Revision 2")).toBeTruthy();
    expect(canvas().textContent).toContain("cable");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Revision 1")).toBeTruthy();
    expect(canvas().textContent).toContain("metal rod");
    expect(fetchMock).not.toHaveBeenCalled();
  }, 15_000);

  it.each([
    "Perhaps a signal travels through a cable from a transmitter to a receiver.",
    "Add a signal travels through a cable from a transmitter to a receiver.",
    "A signal travels through that cable from a transmitter to a receiver.",
  ])("preserves the last valid scene for an ambiguous input, then recovers: %s", (input) => {
    const { container } = render(<App />);
    explain(heat);
    const before = container.querySelector(".doodle-canvas")!.innerHTML;
    explain(input);
    expect(screen.getByText("Revision 1")).toBeTruthy();
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(before);
    explain(signal);
    expect(screen.getByText("Revision 2")).toBeTruthy();
    expect(container.querySelector(".doodle-canvas")!.textContent).toContain("cable");
  });
});
