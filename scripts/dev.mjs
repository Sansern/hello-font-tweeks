import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
const python =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
if (!existsSync(python)) {
  console.error("Run npm run setup first.");
  process.exit(1);
}
const children = [];
function launch(command, args) {
  const child = spawn(command, args, { stdio: "inherit" });
  children.push(child);
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
  return child;
}
let stopping = false;
launch(python, [
  "-m",
  "uvicorn",
  "server.app:app",
  "--host",
  "127.0.0.1",
  "--port",
  "8000",
  "--reload",
  "--reload-dir",
  "server",
]);
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((p) => p.kill("SIGTERM"));
  setTimeout(() => process.exit(code), 300);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
let ready = false;
for (let attempt = 0; attempt < 75 && !stopping; attempt++) {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/health", {
      signal: AbortSignal.timeout(1000),
    });
    ready = response.ok && (await response.json()).status === "ok";
    if (ready) break;
  } catch {
    /* Wait for the local API to finish starting. */
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}
if (!stopping) {
  if (!ready) {
    console.error(
      "Font API did not start. Check Python dependencies and port 8000.",
    );
    stop(1);
  } else
    launch(process.execPath, [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--strictPort",
    ]);
}
