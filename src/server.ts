import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { optionalEnv } from "./config/env";
import { buildOpenApiSpec } from "./docs/swagger";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openApiSpec = buildOpenApiSpec();
app.get("/docs.json", (_req, res) => {
  res.status(200).json(openApiSpec);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use(apiRouter);

app.use(errorHandler);

const port = Number(optionalEnv("PORT") || 3000);
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});

