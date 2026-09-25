/**
 * ============================================================================
 * NGARKUESI I VARIABLAVE TË MJEDISIT (env.js)
 * ============================================================================
 * Qëllimi:
 * Ky skedar lexon skedarin e fshehtë ".env" (Environment Variables).
 * 
 * Si funksionon me fjalë të thjeshta:
 * Çdo program ka sekrete (p.sh. fjalëkalime të databazës, çelësa sigurie, numra portesh)
 * të cilat nuk duhet të shkruhen direkt në kod që të mos i shohë kushdo.
 * Këto sekrete ruhen në një skedar të veçantë me emrin ".env".
 * Ky kod e hap atë skedar, e lexon rresht për rresht, dhe i ngarkon të dhënat në kujtesën e kompjuterit
 * (process.env) që të jenë të gatshme për t'u përdorur nga krejt programi.
 */

import fs from "fs";
import path from "path";

// Gjejmë vendndodhjen e skedarit .env në kompjuter
const envPath = path.resolve(".env");

// Kontrollojmë nëse skedari .env ekziston
if (fs.existsSync(envPath)) {
  // E lexojmë përmbajtjen dhe e ndajmë rresht pas rreshti
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    // Injorojmë rreshtat bosh ose ata që janë komente (fillojnë me #)
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    
    // Ndajmë çelësin nga vlera (p.sh. PORT=4000 ndahet në PORT dhe 4000)
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      // E ruajmë vlerën duke hequr thonjëzat e tepërta
      process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
    }
  }
}
