// Private development entry point: never expose a local model key to the LAN.
import { createInterpreterServer } from "./index.mjs";

const port = Number(process.env.PORT || 8080);
const server = createInterpreterServer().listen(port, "127.0.0.1", () => {
  const actualPort = server.address().port;
  console.log(`Tegeera local interpreter listening on http://127.0.0.1:${actualPort}`);
  process.send?.({ type: "ready", port: actualPort });
});
// A launcher crash must not leave a private backend running unattended.
process.on("disconnect", () => server.close(() => process.exit(0)));
