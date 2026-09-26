// Private development entry point: never expose a local model key to the LAN.
import { createInterpreterServer } from "./index.mjs";

const port = Number(process.env.PORT || 8080);
createInterpreterServer().listen(port, "127.0.0.1", () => {
  console.log(`Tegeera local interpreter listening on http://127.0.0.1:${port}`);
});
