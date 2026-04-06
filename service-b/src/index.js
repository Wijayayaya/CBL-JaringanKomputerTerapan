const express = require("express");
const cors = require("cors");
const { runMigrations } = require("./db");
const { startGrpcServer } = require("./grpcServer");
const { startConsumer } = require("./consumer");
const medicalRecordRoutes = require("./medicalRecordRoutes");
const config = require("./config");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  const { pool } = require("./db");
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "service-b" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.use("/medical-records", medicalRecordRoutes);

async function bootstrap() {
  await runMigrations();
  startGrpcServer();
  await startConsumer();

  app.listen(config.port, () => {
    console.log(`Service B HTTP listening on port ${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Service B failed to start", error);
  process.exit(1);
});