/** Bounded FIFO: new speech never cancels an earlier model request.
 * False means backpressure; callers must retain that phrase and pause capture.
 */
export class SpeechWorkQueue<T> {
  private pending: T[] = [];
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private readonly consume: (item: T) => void | Promise<void>,
    private readonly changed: (waiting: number) => void,
    private readonly failed: (item: T) => void,
    private readonly limit = 8) {}

  enqueue(item: T): boolean {
    if (this.pending.length >= this.limit) return false;
    this.pending.push(item);
    this.changed(this.pending.length);
    this.schedule();
    return true;
  }

  clear(): void {
    this.pending = [];
    clearTimeout(this.timer);
    this.timer = undefined;
    this.changed(0);
  }

  private schedule(): void {
    if (this.running || this.timer !== undefined || !this.pending.length) return;
    // Let React commit the previous scene before resolving the next phrase's context.
    this.timer = setTimeout(() => {
      this.timer = undefined;
      const item = this.pending.shift()!;
      this.running = true;
      this.changed(this.pending.length);
      void Promise.resolve().then(() => this.consume(item)).catch(() => this.failed(item)).finally(() => {
        this.running = false;
        this.schedule();
      });
    }, 0);
  }
}
