import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GeeraExperience from "./GeeraExperience";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduced-motion"), addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Geera landing to real canvas", () => {
  it("ships only the Gemini film and the privacy-safe name story", () => {
    const { container } = render(<GeeraExperience />);
    expect(container.querySelector("video")?.getAttribute("src")).toBe(`${import.meta.env.BASE_URL}media/geera-motion.mp4`);
    expect(container.querySelector("video")?.hasAttribute("controls")).toBe(false);
    expect(container.querySelector(".geera-wordmark img")).toBeNull();
    expect(screen.queryByText("Skip film")).toBeNull();
    expect(container.textContent).toContain("tegeera");
    expect(container.textContent).toContain("struggled to write on the chalkboard");
    expect(container.textContent).not.toMatch(/arthritis|IMG_7128|Musoke|Nestroy|made with Gemini/i);
    expect(screen.getAllByText(/Speak or type an explanation/).length).toBeGreaterThan(0);
    expect(container.querySelector(".app")).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
  it("does not open a canvas or call a provider for blank input", () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<GeeraExperience />);
    fireEvent.click(screen.getByRole("button", { name: /Draw it/ }));
    expect(screen.getByText("Write an explanation first.")).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("hands off exactly once under StrictMode, then supports another explanation and Undo", async () => {
    const { container } = render(<StrictMode><GeeraExperience /></StrictMode>);
    fireEvent.change(screen.getByLabelText("What would you like to explain?"), { target: { value: "Three students share two books" } });
    fireEvent.click(screen.getByRole("button", { name: /Draw it/ }));
    await waitFor(() => expect(screen.getByText("Revision 1")).toBeTruthy(), { timeout: 10000 });
    expect(container.querySelectorAll(".doodle-object")).toHaveLength(5);
    expect(screen.queryByText("AI understanding (optional)")).toBeNull();
    expect(screen.queryByText("Device performance evidence")).toBeNull();
    expect(container.querySelector('img[src*="tegeera-mark"]')).toBeNull();
    expect(screen.getByText("Explore examples by subject")).toBeTruthy();
    fireEvent.submit(container.querySelector("#try-geera")!);
    expect(screen.getByText(/Please wait before trying/)).toBeTruthy();
    expect(screen.getByText("Revision 1")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: "Draw a car" } });
    fireEvent.submit(container.querySelector(".control-card form")!);
    expect(screen.getByText("Revision 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Revision 1")).toBeTruthy();
  }, 15000);
  it("keeps the page usable when canvas decoding is unavailable", () => {
    const { container } = render(<GeeraExperience />);
    expect(container.querySelector(".geera-final-still")).not.toBeNull();
    expect(container.querySelector(".is-scrubbing")).toBeNull();
    expect(screen.getByRole("button", { name: /Draw it/ })).toBeEnabled();
  });
});
