const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const config = require("./config");
const { pool } = require("./db");

const packageDefinition = protoLoader.loadSync(config.grpc.protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition);

async function getPatientSummary(call, callback) {
  const patientId = call.request.patient_id;
  try {
    const recordRes = await pool.query(
      `SELECT patient_id, last_visit_at
       FROM medical_records
       WHERE patient_id = $1
       LIMIT 1`,
      [patientId]
    );

    const allergyRes = await pool.query(
      `SELECT code, label, is_critical
       FROM allergies
       WHERE patient_id = $1`,
      [patientId]
    );

    const hasRecord = recordRes.rows.length > 0;
    const response = {
      patient_id: patientId,
      has_record: hasRecord,
      allergies: allergyRes.rows,
      last_visit_at: hasRecord && recordRes.rows[0].last_visit_at
        ? new Date(recordRes.rows[0].last_visit_at).toISOString()
        : ""
    };

    callback(null, response);
  } catch (error) {
    callback({ code: grpc.status.INTERNAL, message: error.message });
  }
}

function startGrpcServer() {
  const server = new grpc.Server();
  server.addService(proto.clinic.v1.MedicalRecordService.service, {
    GetPatientSummary: getPatientSummary
  });

  server.bindAsync(
    `0.0.0.0:${config.grpc.port}`,
    grpc.ServerCredentials.createInsecure(),
    (err) => {
      if (err) {
        throw err;
      }
      server.start();
      console.log(`Service B gRPC listening on port ${config.grpc.port}`);
    }
  );
}

module.exports = { startGrpcServer };
