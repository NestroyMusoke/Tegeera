import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";

/** A single-volume quota ledger, not a distributed billing system.
 * Atomic reservation precedes EVERY provider attempt. No prompts or keys saved.
 * A crashed writer leaves a lock: fail closed rather than silently reset credit.
 */
export function createProviderBudget({ limit, file, now = Date.now }) {
  if (file && !isAbsolute(file)) throw new Error("PROVIDER_BUDGET_FILE must be an absolute persistent-volume path.");
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Invalid provider budget limit.");
  let memory = { day: Math.floor(now() / 86_400_000), count: 0 };
  const read = () => {
    const today = Math.floor(now() / 86_400_000);
    let entry = memory;
    if (file && existsSync(file)) {
      const raw = readFileSync(file, "utf8");
      if (raw.length > 256) throw new Error("Provider budget unavailable.");
      entry = JSON.parse(raw);
      if (!entry || !Number.isInteger(entry.day) || !Number.isInteger(entry.count) || entry.count < 0 || entry.day > today) {
        throw new Error("Provider budget unavailable.");
      }
    }
    return entry.day === today ? entry : { day: today, count: 0 };
  };
  return {
    remaining() {
      try { return (!file || !existsSync(`${file}.lock`)) && read().count < limit; }
      catch { return false; }
    },
    reserve() {
      let lock;
      try {
        if (file) {
          mkdirSync(dirname(file), { recursive: true });
          lock = openSync(`${file}.lock`, "wx", 0o600);
        }
        const entry = read();
        if (entry.count >= limit) throw new Error("Provider call budget exhausted.");
        const updated = { day: entry.day, count: entry.count + 1 };
        if (file) {
          writeFileSync(`${file}.pending`, JSON.stringify(updated), { mode: 0o600 });
          renameSync(`${file}.pending`, file);
        } else memory = updated;
      } catch {
        throw new Error("Provider call budget exhausted.");
      } finally {
        if (lock !== undefined) { closeSync(lock); unlinkSync(`${file}.lock`); }
      }
    }
  };
}
