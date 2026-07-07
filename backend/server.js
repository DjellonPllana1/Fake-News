import "./env.js";
import app from "./app.js";
import { ensureDatabaseSchema } from "./database.js";

const port = Number(process.env.PORT || 4000);

ensureDatabaseSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend server listening at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database schema check failed.", error);
    process.exit(1);
  });
