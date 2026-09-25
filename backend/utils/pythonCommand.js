/**
 * ============================================================================
 * PËRCAKTUESI I KOMANDËS SË PYTHON-IT (pythonCommand.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar gjen mënyrën më të mirë për të ekzekutuar skriptet e Python-it në kompjuter.
 * 
 * Si funksionon me fjalë të thjeshta:
 * Disa kompjuterë kanë Python të instaluar globalisht, ndërsa disa përdorin
 * mjete moderne si `uv` për të menaxhuar libraritë e Inteligjencës Artificiale.
 * Ky funksion kontrollon cilën mënyrë të përdorë automatikisht pa pasur nevojë
 * që përdoruesi të konfigurojë gjë me dorë.
 */

import path from "path";

export function resolvePythonInvocation(scriptPath, scriptArgs = []) {
  // Nëse programuesi ka caktuar një Python specifik në skedarin .env (PYTHON_BIN)
  if (process.env.PYTHON_BIN) {
    return {
      command: process.env.PYTHON_BIN,
      args: [scriptPath, ...scriptArgs],
      env: {},
    };
  }

  // Përndryshe përdorim mjetin ultra të shpejtë "uv" me varësitë e requirements.txt
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
