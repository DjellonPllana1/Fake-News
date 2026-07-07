import "./env.js";
import app from "./app.js";
import { ensureDatabaseSchema } from "./database.js";

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "127.0.0.1";

ensureDatabaseSchema()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`Backend server listening at http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database schema check failed.", error);
    process.exit(1);
  });
