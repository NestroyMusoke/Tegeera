#!/usr/bin/env node
// Explicit one-call live check. Never reads or prints the private API key.
const base = process.env.TEGEERA_LOCAL_URL || "http://127.0.0.1:8080";

try {
  const healthResponse = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
  if (!healthResponse.ok) throw new Error(`Health check returned HTTP ${healthResponse.status}.`);
  const health = await healthResponse.json();
  console.log(`Backend: ${health.configured ? "configured" : "not configured"}; provider: ${health.provider || "none"}; model: ${health.model || "none"}`);
  if (!health.configured || health.provider !== "nebius" || !String(health.model || "").toLowerCase().includes("nemotron")) {
    throw new Error("Nebius Token Factory Nemotron is not configured. Check server/.env.local and restart the backend.");
  }

  // This deliberately consumes one provider request; it runs only when invoked by a person.
  const started = performance.now();
  const response = await fetch(`${base}/v1/interpret`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "A yellow book", scene: { entities: [], relations: [] } }),
    signal: AbortSignal.timeout(55_000)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Interpretation returned HTTP ${response.status}: ${result.error || "unknown error"}`);
  if (!result.candidate || !Array.isArray(result.candidate.objects) || !Array.isArray(result.candidate.connections)) {
    throw new Error("Provider response did not contain a valid scene blueprint.");
  }
  if (result.provider !== "nebius" || !String(result.model || "").toLowerCase().includes("nemotron")) {
    throw new Error("Response did not come from Nebius Nemotron.");
  }
  console.log(`Live Nebius interpretation: valid blueprint; ${result.candidate.objects.length} objects; ${result.candidate.connections.length} connections; ${Math.round(performance.now() - started)} ms.`);
  console.log("This checks connectivity and structure, not visual accuracy or production readiness.");
} catch (error) {
  console.error(`Local Nebius check failed: ${error.message}`);
  process.exitCode = 1;
}
