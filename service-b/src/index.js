const { runMigrations } = require("./db");
const { startGrpcServer } = require("./grpcServer");
const { startConsumer } = require("./consumer");

async function bootstrap() {
  await runMigrations();
  startGrpcServer();
  await startConsumer();
}

bootstrap().catch((error) => {
  console.error("Service B failed to start", error);
  process.exit(1);
});
