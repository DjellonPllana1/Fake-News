import path from "path";

export function resolvePythonInvocation(scriptPath, scriptArgs = []) {
  if (process.env.PYTHON_BIN) {
    return {
      command: process.env.PYTHON_BIN,
      args: [scriptPath, ...scriptArgs],
      env: {},
    };
  }

  return {
    command: "uv",
    args: [
      "run",
      "--python-preference",
      "only-managed",
      "--no-project",
      "--with-requirements",
      path.resolve("requirements.txt"),
      "python",
      scriptPath,
      ...scriptArgs,
    ],
    env: {
      UV_CACHE_DIR: path.resolve(".tmp", "uv-cache"),
      UV_PYTHON_INSTALL_DIR: path.resolve(".tmp", "uv-python"),
    },
  };
}
