const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const config = require("./config");

const packageDefinition = protoLoader.loadSync(config.grpc.protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const client = new proto.clinic.v1.MedicalRecordService(
  config.grpc.address,
  grpc.credentials.createInsecure()
);

function getPatientSummary(patientId) {
  return new Promise((resolve, reject) => {
    client.GetPatientSummary({ patient_id: patientId }, (err, response) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(response);
    });
  });
}

module.exports = { getPatientSummary };
