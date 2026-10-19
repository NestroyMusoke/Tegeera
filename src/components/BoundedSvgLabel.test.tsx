import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { BoundedSvgLabel } from "./BoundedSvgLabel";

it.each(["soil", "refrigerator", "emergency medical cabinet", "portable oxygen cylinder", "W".repeat(60), "🧪".repeat(60)])("bounds the visible plaque text while retaining the full accessible label: %s", (value) => {
  const document = new DOMParser().parseFromString(renderToStaticMarkup(<svg><BoundedSvgLabel
    value={value} x={200} y={100} width={160} height={42} maxFont={25} fill="#245c4b" /></svg>), "image/svg+xml");
  const group = document.querySelector("g")!;
  expect(group.getAttribute("aria-label")).toBe(value);
  expect(group.querySelector("title")!.textContent).toBe(value);
  const lines = [...group.querySelectorAll("text")];
  expect(lines.length).toBeLessThanOrEqual(3);
  for (const line of lines) {
    const font = Number(line.getAttribute("font-size"));
    const baseline = Number(line.getAttribute("y"));
    expect(Number(line.getAttribute("textLength"))).toBeLessThanOrEqual(160);
    expect(font).toBeGreaterThanOrEqual(11);
    expect(baseline - font * .8).toBeGreaterThanOrEqual(79);
    expect(baseline + font * .25).toBeLessThanOrEqual(121);
  }
});
