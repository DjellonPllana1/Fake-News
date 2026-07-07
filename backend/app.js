import cors from "cors";
import express from "express";
import { requestLogger } from "./middleware/requestLogger.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(requestLogger);
app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
