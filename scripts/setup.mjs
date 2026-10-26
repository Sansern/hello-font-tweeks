import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
const python =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
function run(command, args) {
  const r = spawnSync(command, args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
if (!existsSync(python))
  run(process.platform === "win32" ? "python" : "python3", [
    "-m",
    "venv",
    ".venv",
  ]);
run(python, ["-m", "pip", "install", "-r", "server/requirements.txt"]);
console.log("\nReady. Run npm run dev, then open http://127.0.0.1:5173");
