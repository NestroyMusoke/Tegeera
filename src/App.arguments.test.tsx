import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function submit(text: string) {
  fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
}
it("mixes checked illustrations with connected questions and preserves every sentence", () => {
  render(<App />);
  const text = "Three students share two books. Is that fair? Draw a car. Who owns it?";
  submit(text);
  const map = screen.getByRole("region", { name: "Source-preserving argument map" });
  expect(within(map).getByRole("group", { name: "Illustration of part 1" }).querySelector("svg")).toBeTruthy();
  expect(within(map).getByRole("group", { name: "Illustration of part 3" }).querySelector("svg")).toBeTruthy();
  expect(within(map).queryByRole("group", { name: "Illustration of part 2" })).toBeNull();
  expect([...map.querySelectorAll("blockquote")].map(node => node.textContent).join("")).toBe(text);
  expect(within(map).getAllByLabelText("Next part in reading order")).toHaveLength(3);
});
it("maps an abstract explanation offline, draws again, and restores the map with Undo", () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(<App />);
  submit("Draw a car");
  expect(container.querySelectorAll(".doodle-object").length).toBeGreaterThan(0);
  submit("Fairness refers to equal opportunity. However, no person can enter this room without stairs. Is that equal access?");
  const map = screen.getByRole("region", { name: "Source-preserving argument map" });
  expect(within(map).getByText("Open question")).toBeTruthy();
  expect(map.querySelectorAll("mark").length).toBeGreaterThan(0);
  expect(container.querySelector(".doodle-canvas")).toBeNull();
  expect(map.textContent).toContain("not a fact-check");
  submit("Draw a book");
  expect(screen.queryByRole("region", { name: "Source-preserving argument map" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByRole("region", { name: "Source-preserving argument map" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(container.querySelector(".doodle-canvas")).toBeTruthy();
  // Health probes are allowed, paid chat/interpretation/glyph calls are not.
  expect(fetchMock.mock.calls.some(([url]) => /chat\/completions|\/v1\//.test(String(url)))).toBe(false);
});
it("explicit concept mode accepts one negative claim and keeps the map on oversized input", () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Visual format"), { target: { value: "argument" } });
  submit("The proposed policy is not evidence of success.");
  const map = screen.getByRole("region", { name: "Source-preserving argument map" });
  expect(map.textContent).toContain("The proposed policy is not evidence of success.");
  submit("x".repeat(501));
  expect(screen.getByRole("region", { name: "Source-preserving argument map" })).toBe(map);
  expect(screen.getByText("Enter an explanation between 1 and 500 characters.")).toBeTruthy();
});

it("renders the supplied law paragraph as attributed wording and leaves its final question open", () => {
  render(<App />);
  const text = "Rule of Law refers to when no one in the country is above the law. In Uganda, this is a very different case because of lack of separation of powers in the different arms of the government. None is independent of each other but then this also very different from Montesqueu's ideology. Is there really seperation if the Judiciary is not independent.";
  submit(text);
  const map = screen.getByRole("region", { name: "Source-preserving argument map" });
  expect([...map.querySelectorAll("blockquote")].map(node => node.textContent).join("")).toBe(text);
  expect(map.querySelectorAll("article")).toHaveLength(4);
  expect(map.querySelector("article:last-child")).toBeTruthy();
  expect(within(map).getByText("Open question")).toBeTruthy();
  expect(within(map).getByText("Conditional wording")).toBeTruthy();
});

it("does not execute HTML-looking explanations or invent causal arrows", () => {
  const { container } = render(<App />);
  fireEvent.change(screen.getByLabelText("Visual format"), { target: { value: "argument" } });
  submit('<script>alert("no")</script> This is not evidence. Is it a claim?');
  const map = screen.getByRole("region", { name: "Source-preserving argument map" });
  expect(map.querySelector("script")).toBeNull();
  expect(map.textContent).toContain('<script>alert("no")</script>');
  expect(container.querySelector(".universal-relation")).toBeNull();
  expect(map.textContent).toContain("not proof or causation");
});

it("a late object-model reply cannot overwrite a newer local argument map", async () => {
  let finish!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { finish = resolve; });
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
    init?.method ? pending : Promise.resolve(new Response("{}", { status: 200 }))));
  render(<App />);
  fireEvent.change(screen.getByLabelText("OpenRouter key for this session"), { target: { value: "test-session-key" } });
  fireEvent.click(screen.getByRole("button", { name: "Enable AI understanding" }));
  submit("A dragon flies over a tiny village");
  fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: "Privacy refers to control over information. Is permission always freely given?" } });
  fireEvent.click(screen.getByRole("button", { name: "Update drawing" }));
  const map = screen.getByRole("region", { name: "Source-preserving argument map" });
  await act(async () => { finish(new Response("{}", { status: 200 })); await pending; });
  expect(screen.getByRole("region", { name: "Source-preserving argument map" })).toBe(map);
  expect(screen.queryByRole("button", { name: "Stop AI" })).toBeNull();
});
