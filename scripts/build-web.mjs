import { spawnSync } from "node:child_process";
// Portable on Windows and Linux; the public bundle contains a path, never a model key.
const result = spawnSync(process.execPath, [process.env.npm_execpath, "run", "build"], {
  stdio: "inherit", env: { ...process.env, VITE_TEGEERA_INTERPRETER_URL: "/api" }
});
process.exit(result.status ?? 1);
