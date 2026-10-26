import { isAbsolute } from "node:path";

export function assertProductionSafety({ production, configured, budgetFile, allowedOrigins, remoteBudget }) {
  if (!production || !configured) return;
  if (!remoteBudget && (!budgetFile || !isAbsolute(budgetFile))) throw new Error("Production AI requires a persistent quota file or configured Upstash budget.");
  if (!allowedOrigins.size) throw new Error("Production AI requires an explicit HTTPS ALLOWED_ORIGINS value.");
  for (const origin of allowedOrigins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error("Invalid production origin."); }
    if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password) {
      throw new Error("Production origins must be exact HTTPS origins, without paths or credentials.");
    }
  }
}
