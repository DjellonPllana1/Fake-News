/**
 * ============================================================================
 * PIKA E NISJES SË SERVERIT (server.js)
 * ============================================================================
 * Qëllimi:
 * Ky është skedari i parë që ekzekutohet kur ndezim backend-in (serverin).
 * 
 * Si funksionon me fjalë të thjeshta:
 * 1. Lexon konfigurimet nga skedari .env (portin, fjalëkalimet etj.).
 * 2. Kontrollon nëse baza e të dhënave (databaza) është gati dhe ka tabelat e duhura.
 * 3. Ndez "veshin" e serverit (app.listen) që të presë kërkesa nga vizitorët në adresën
 *    http://127.0.0.1:4000 (ose portin e caktuar).
 */

import "./env.js";
import app from "./app.js";
import { ensureDatabaseSchema } from "./database.js";

// Përcaktojmë portin (si një derë hyrëse në kompjuter, parazgjedhur 4000)
const port = Number(process.env.PORT || 4000);
// Adresa IP lokale ku punon serveri
const host = process.env.HOST || "127.0.0.1";

// Hapi 1: Sigurohemi që databaza është gati
ensureDatabaseSchema()
  .then(() => {
    // Hapi 2: Ndezim serverin të presë vizitorët
    app.listen(port, host, () => {
      console.log(`Backend server listening at http://${host}:${port}`);
    });
  })
  .catch((error) => {
    // Nëse ka problem me databazën, serveri ndalon dhe tregon gabimin
    console.error("Database schema check failed.", error);
    process.exit(1);
  });
