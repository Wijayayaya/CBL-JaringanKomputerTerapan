const path = require("path");
require("dotenv").config();

module.exports = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5434),
    database: process.env.DB_NAME || "medical_record_db",
    user: process.env.DB_USER || "service_b",
    password: process.env.DB_PASS || "service_b_pass"
  },
  rabbit: {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    queue: process.env.RABBITMQ_QUEUE || "patient.registered",
    dlq: process.env.RABBITMQ_DLX || "patient.registered.dlq"
  },
  grpc: {
    port: Number(process.env.GRPC_PORT || 50051),
    protoPath: path.resolve(__dirname, process.env.PROTO_PATH || "../../proto/patient_record.proto")
  }
};
