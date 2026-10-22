import { createWebServer } from "./web.mjs";
const port = Number(process.env.PORT || 8080);
const allowedOrigins = new Set([`http://localhost:${port}`, `http://127.0.0.1:${port}`]);
// Private local smoke target: never bind a shared developer key to the LAN.
createWebServer({ apiOptions: { allowedOrigins } }).listen(port, "127.0.0.1", () => {
  console.log(`Tegeera local web app: http://127.0.0.1:${port}/`);
});
