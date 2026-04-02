const path = require("path");
require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 8080),
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5433),
    database: process.env.DB_NAME || "registration_db",
    user: process.env.DB_USER || "service_a",
    password: process.env.DB_PASS || "service_a_pass"
  },
  rabbit: {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    queue: process.env.RABBITMQ_QUEUE || "patient.registered"
  },
  grpc: {
    address: process.env.SERVICE_B_GRPC_ADDR || "localhost:50051",
    protoPath: path.resolve(__dirname, process.env.PROTO_PATH || "../../proto/patient_record.proto")
  },
  outboxPollMs: Number(process.env.OUTBOX_POLL_MS || 2000)
};
