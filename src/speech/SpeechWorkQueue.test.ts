import { afterEach, expect, it, vi } from "vitest";
import { SpeechWorkQueue } from "./SpeechWorkQueue";
afterEach(() => vi.useRealTimers());
it("serializes phrases behind an eight-second provider without cancellation", async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const work = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const queue = new SpeechWorkQueue<string>(work, vi.fn(), vi.fn());
  queue.enqueue("A book rests on a table");
  await vi.advanceTimersByTimeAsync(1);
  queue.enqueue("Move it to the left");
  await vi.advanceTimersByTimeAsync(8000);
  expect(work.mock.calls).toEqual([["A book rests on a table"]]);
  finish();
  await vi.runAllTimersAsync();
  expect(work.mock.calls).toEqual([["A book rests on a table"], ["Move it to the left"]]);
});
it("reports backpressure and cancels queued work", async () => {
  vi.useFakeTimers();
  const work = vi.fn();
  const queue = new SpeechWorkQueue<string>(work, vi.fn(), vi.fn(), 2);
  expect(queue.enqueue("one")).toBe(true);
  expect(queue.enqueue("two")).toBe(true);
  expect(queue.enqueue("three")).toBe(false);
  queue.clear();
  await vi.runAllTimersAsync();
  expect(work).not.toHaveBeenCalled();
});
it("reports failed work and continues with later phrases", async () => {
  vi.useFakeTimers();
  const failed = vi.fn();
  const work = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
  const queue = new SpeechWorkQueue<string>(work, vi.fn(), failed);
  queue.enqueue("first"); queue.enqueue("second");
  await vi.runAllTimersAsync();
  expect(failed).toHaveBeenCalledWith("first");
  expect(work).toHaveBeenCalledTimes(2);
});
