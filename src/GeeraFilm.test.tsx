import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import GeeraFilm from "./GeeraFilm";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("scrubs cached phone frames forwards and backwards without loading video", () => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("max-width"), addEventListener() {}, removeEventListener() {} }));
  const images: { src: string; onload: (() => void) | null; onerror: (() => void) | null }[] = [];
  vi.stubGlobal("Image", class { src = ""; onload = null; onerror = null; constructor() { images.push(this); } });
  let callback: FrameRequestCallback = () => undefined;
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => { callback = fn; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const { container } = render(<GeeraFilm openCanvas={() => undefined} />);
  expect(container.querySelector("video")).toBeNull();
  expect(images).toHaveLength(4);
  act(() => { for (let i = 0; i < 60; i++) images[i].onload?.(); });
  expect(images).toHaveLength(60);
  const section = container.querySelector("section")!;
  Object.defineProperty(section, "offsetHeight", { value: 4000 });
  Object.defineProperty(section.firstElementChild, "clientHeight", { value: 800 });
  const rect = vi.spyOn(section, "getBoundingClientRect");
  rect.mockReturnValue({ top: -3200 } as DOMRect);
  act(() => { fireEvent.scroll(window); callback(0); });
  expect(container.querySelector(".geera-film-source")?.getAttribute("src")).toContain("/59.webp");
  rect.mockReturnValue({ top: 0 } as DOMRect);
  act(() => { fireEvent.scroll(window); callback(1); });
  expect(container.querySelector(".geera-film-source")?.getAttribute("src")).toContain("/0.webp");
});
