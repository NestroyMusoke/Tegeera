import { glyphKey, glyphSchema, type TegeeraGlyph } from "./glyph";

const databaseName = "tegeera-glyph-cache";
const storeName = "glyphs";
const maxEntries = 256;
interface StoredGlyph { noun: string; glyph: TegeeraGlyph; updatedAt: number }

function openGlyphDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(databaseName, 1); }
    catch { resolve(null); return; }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: "noun" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

/** A failed/disabled private-mode IndexedDB is a cache miss, never a scene failure. */
export async function loadGlyphCache(): Promise<Map<string, TegeeraGlyph>> {
  const database = await openGlyphDatabase();
  if (!database) return new Map();
  try {
    return await new Promise<Map<string, TegeeraGlyph>>((resolve) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => {
        const result = new Map<string, TegeeraGlyph>();
        for (const row of request.result as StoredGlyph[]) {
          if (typeof row?.noun !== "string" || glyphKey(row.noun) !== row.noun) continue;
          const parsed = glyphSchema.safeParse(row.glyph);
          if (parsed.success) result.set(row.noun, parsed.data);
        }
        resolve(result);
      };
      request.onerror = () => resolve(new Map());
      transaction.onabort = () => resolve(new Map());
    });
  } catch { return new Map(); }
  finally { database.close(); }
}

/** Store only fully validated glyph data; never transcripts, API keys, or raw model output. */
export async function rememberGlyph(noun: string, candidate: unknown): Promise<boolean> {
  const normalized = glyphKey(noun);
  const parsed = glyphSchema.safeParse(candidate);
  if (!normalized || normalized.length > 48 || !parsed.success) return false;
  const database = await openGlyphDatabase();
  if (!database) return false;
  try {
    return await new Promise<boolean>((resolve) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      store.put({ noun: normalized, glyph: parsed.data, updatedAt: Date.now() } satisfies StoredGlyph);
      const all = store.getAll();
      all.onsuccess = () => {
        const rows = (all.result as StoredGlyph[]).sort((a, b) => b.updatedAt - a.updatedAt);
        for (const row of rows.slice(maxEntries)) store.delete(row.noun);
      };
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    });
  } catch { return false; }
  finally { database.close(); }
}
