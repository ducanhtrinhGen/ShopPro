import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const children = [];
let shuttingDown = false;

function prefixStream(stream, name, isError = false) {
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => {
    const text = `[${name}] ${line}`;
    if (isError) {
      console.error(text);
    } else {
      console.log(text);
    }
  });
}

function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
    stdio: "ignore"
  });

  killer.on("error", () => {
    // Ignore cleanup errors.
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    killProcessTree(child.pid);
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 500);
}

function startScript(name, scriptFile) {
  const scriptPath = resolve(rootDir, scriptFile);
  const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"]
  });

  prefixStream(child.stdout, name, false);
  prefixStream(child.stderr, name, true);

  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
      console.error(`[${name}] exited with ${reason}`);
      shutdown(code ?? 1);
    }
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });

  children.push(child);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

startScript("BE", "run-be.ps1");
startScript("FE", "run-fe.ps1");