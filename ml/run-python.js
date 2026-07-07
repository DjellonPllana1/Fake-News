import { spawn } from "child_process";
import path from "path";

const [, , scriptPath, ...scriptArgs] = process.argv;

if (!scriptPath) {
  console.error("Usage: node ml/run-python.js <script.py> [...args]");
  process.exit(1);
}

function resolveInvocation(targetScript, args) {
  if (process.env.PYTHON_BIN) {
    return {
      command: process.env.PYTHON_BIN,
      commandArgs: [targetScript, ...args],
      env: {},
    };
  }

  return {
    command: "uv",
    commandArgs: [
      "run",
      "--python-preference",
      "only-managed",
      "--no-project",
      "--with-requirements",
      path.resolve("requirements.txt"),
      "python",
      targetScript,
      ...args,
    ],
    env: {
      UV_CACHE_DIR: path.resolve(".tmp", "uv-cache"),
      UV_PYTHON_INSTALL_DIR: path.resolve(".tmp", "uv-python"),
    },
  };
}

const invocation = resolveInvocation(scriptPath, scriptArgs);
const child = spawn(invocation.command, invocation.commandArgs, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    ...invocation.env,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
