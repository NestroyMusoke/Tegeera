import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(cleanup);

function explain(text: string) {
  fireEvent.change(screen.getByLabelText("Your explanation"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Draw it" }));
}

describe("teaching workflow", () => {
  it("accepts a polite classroom paraphrase but preserves the scene for polite negation", () => {
    const { container } = render(<App />);
    explain("Could you please show me three students sharing two books?");
    expect(container.querySelectorAll(".doodle-object")).toHaveLength(5);
    expect(container.querySelector(".relationship-key")?.textContent).toContain("share");
    const scene = container.querySelector(".doodle-canvas")!.innerHTML;
    explain("Could you not clear everything");
    expect(screen.getByText("Help me understand")).toBeTruthy();
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(scene);
  });
  it("changes view without changing scene revision or consuming Undo", () => {
    const { container } = render(<App />);
    expect((screen.getByRole("button", { name: "Read details" }) as HTMLButtonElement).disabled).toBe(true);
    explain("Three students each have a book");
    const drawing = container.querySelector(".doodle-canvas")!.innerHTML;
    fireEvent.click(screen.getByRole("button", { name: "Read details" }));
    expect(screen.getByRole("region", { name: "Scrollable drawing detail" }).tabIndex).toBe(0);
    expect(screen.getByRole("button", { name: "Read details" }).getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(drawing);
    expect(screen.getByText("Revision 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    expect(container.querySelector(".is-detail")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(container.querySelectorAll(".doodle-object")).toHaveLength(0);
  });
  it("keeps controls before ownership details in reading and tab order", async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText("Typed input ready")).toBeTruthy());
    explain("Three students each have two books");
    expect(container.querySelectorAll(".ownership-card")).toHaveLength(3);
    const controls = container.querySelector(".control-card")!;
    const details = container.querySelector(".ownership-details")!;
    expect(controls.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".canvas-shell .control-card")).toBeNull();
    expect((screen.getByLabelText("Your explanation") as HTMLInputElement).value).toBe("");
  });
  it("transfers, undoes and rejects unsupported input through the real form", () => {
    const { container } = render(<App />);
    explain("Three students each have a book");
    explain("The first student gives book 1 to the second student");
    expect(container.querySelectorAll('[data-owner-id="student-2"] [data-owned-id]')).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(container.querySelectorAll('[data-owner-id="student-1"] [data-owned-id]')).toHaveLength(1);
    const scene = container.querySelector(".doodle-canvas")!.innerHTML;
    explain("A dragon eats the books");
    expect(screen.getByText("Help me understand")).toBeTruthy();
    expect(container.querySelector(".doodle-canvas")!.innerHTML).toBe(scene);
    expect((screen.getByLabelText("Your explanation") as HTMLInputElement).value).toBe("A dragon eats the books");
    explain("Clear everything");
    expect(container.querySelectorAll(".ownership-card")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(container.querySelectorAll(".ownership-card")).toHaveLength(3);
  });
});
