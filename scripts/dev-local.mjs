import { fork, spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function browserEnvironment(environment, port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid backend port");
  // Never forward provider credentials to the frontend process.
  const clean = Object.fromEntries(Object.entries(environment).filter(([key]) =>
    !/API_KEY|TOKEN|SECRET|PASSWORD/i.test(key)));
  return { ...clean, VITE_TEGEERA_INTERPRETER_URL: `http://127.0.0.1:${port}` };
}

export async function startLocal({ check = false } = {}) {
  const root = resolve(import.meta.dirname, "..");
  const children = [];
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await Promise.all(children.map(child => new Promise(done => {
      if (child.exitCode !== null || child.signalCode !== null) return done();
      const timer = setTimeout(() => { child.kill("SIGKILL"); done(); }, 2000);
      child.once("exit", () => { clearTimeout(timer); done(); });
      child.kill();
    })));
  };
  const interrupt = () => { void stop(); };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    const backend = fork(resolve(root, "server/local.mjs"), [], {
      cwd: resolve(root, "server"), execArgv: ["--env-file=.env.local"],
      env: { ...process.env, PORT: "0", ALLOWED_ORIGINS: "http://127.0.0.1:5173,http://localhost:5173" },
      stdio: ["ignore", "inherit", "inherit", "ipc"], windowsHide: true
    });
    children.push(backend);
    const port = await new Promise((accept, reject) => {
      const timer = setTimeout(() => reject(new Error("Backend startup timed out")), 15000);
      const finish = (error, value) => { clearTimeout(timer); error ? reject(error) : accept(value); };
      backend.once("error", error => finish(error));
      backend.once("exit", () => finish(new Error("Backend stopped. Check server/.env.local (never paste its key into chat).")));
      backend.once("message", message => {
        try { browserEnvironment({}, message?.port); }
        catch (error) { finish(error); return; }
        finish(null, message.port);
      });
    });
    const env = browserEnvironment(process.env, port);
    const health = await fetch(`${env.VITE_TEGEERA_INTERPRETER_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const status = await health.json();
    if (!health.ok || !status.configured) throw new Error("No provider configured. Add your private provider key to server/.env.local first.");
    console.log(`Private backend connected: ${status.provider}. No model request made during startup.`);
    const frontend = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5173", "--strictPort"], {
      cwd: root, env, stdio: ["ignore", "inherit", "inherit"], windowsHide: true
    });
    children.push(frontend);
    frontend.on("error", () => { process.exitCode = 1; void stop(); });
    for (const child of children) child.once("exit", code => {
      if (!stopping) { process.exitCode = code || 1; void stop(); }
    });
    if (check) {
      let ready = false;
      for (let attempt = 0; attempt < 40 && !stopping; attempt++) {
        try {
          const response = await fetch("http://127.0.0.1:5173/src/llm/remoteInterpreter.ts", { signal: AbortSignal.timeout(1000) });
          const source = await response.text();
          if (response.ok && source.includes(env.VITE_TEGEERA_INTERPRETER_URL)) { ready = true; break; }
        } catch { /* Vite is still starting. */ }
        await new Promise(done => setTimeout(done, 250));
      }
      if (!ready) throw new Error("Frontend did not load with the private backend URL; check whether port 5173 is already in use.");
      console.log("PASS: frontend receives the backend URL. This is wiring verification, not visual or phone approval.");
      await stop();
    } else console.log("Open http://127.0.0.1:5173 — Ctrl+C stops both processes.");
  } catch (error) {
    await stop();
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  startLocal({ check: process.argv.includes("--check") }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
