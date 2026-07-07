import cors from "cors";
import express from "express";
import { requestLogger } from "./middleware/requestLogger.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
const configuredOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const corsOptions =
  configuredOrigins.length && !configuredOrigins.includes("*")
    ? {
        origin: configuredOrigins,
        credentials: true,
      }
    : undefined;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(requestLogger);
app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
