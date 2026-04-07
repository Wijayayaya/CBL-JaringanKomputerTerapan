const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const config = require("./config");
const { pool, runMigrations } = require("./db");
const { connectRabbit } = require("./rabbit");
const { processOutboxOnce } = require("./outboxRelay");
const { getPatientSummary } = require("./grpcClient");
const patientRoutes = require("./patientRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "service-a" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.use("/patients", patientRoutes);

app.post("/registrations", async (req, res) => {
  const { name, dateOfBirth, gender, visitDate, clinicCode, requireRealtimeValidation, medical } = req.body;

  if (!name || !dateOfBirth || !gender || !visitDate || !clinicCode) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }

  const patientId = uuidv4();
  const registrationId = uuidv4();
  const eventId = uuidv4();
  const normalizedMedical = {
    diagnosis: medical?.diagnosis ? String(medical.diagnosis).trim() : null,
    notes: medical?.notes ? String(medical.notes).trim() : null,
    allergies: Array.isArray(medical?.allergies)
      ? medical.allergies.reduce((items, item) => {
          const code = item?.code != null ? String(item.code).trim() : "";
          const label = item?.label != null ? String(item.label).trim() : "";
          if (!code || !label) {
            return items;
          }
          items.push({
            code,
            label,
            is_critical: Boolean(item?.is_critical),
          });
          return items;
        }, [])
      : [],
    visit: {
      visit_date: medical?.visit?.visit_date || visitDate,
      clinic_code: medical?.visit?.clinic_code || clinicCode,
      diagnosis: medical?.visit?.diagnosis ? String(medical.visit.diagnosis).trim() : null,
      doctor_notes: medical?.visit?.doctor_notes ? String(medical.visit.doctor_notes).trim() : null,
    },
  };

  const client = await pool.connect();
  try {
    const shouldRealtimeValidate = requireRealtimeValidation !== false;
    let realtimeSummary = null;
    let realtimeStatus = shouldRealtimeValidate ? "pending" : "skipped";
    let realtimeErrorDetail = null;

    if (shouldRealtimeValidate) {
      try {
        realtimeSummary = await getPatientSummary(patientId);
        realtimeStatus = "validated";
      } catch (grpcError) {
        realtimeStatus = "queued";
        realtimeErrorDetail = grpcError.message;
      }
    }

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO patients(id, name, date_of_birth, gender)
       VALUES ($1, $2, $3, $4)`,
      [patientId, name, dateOfBirth, gender],
    );

    await client.query(
      `INSERT INTO registrations(id, patient_id, visit_date, clinic_code, requires_realtime_validation)
       VALUES ($1, $2, $3, $4, $5)`,
      [registrationId, patientId, visitDate, clinicCode, shouldRealtimeValidate],
    );

    const eventPayload = {
      event_id: eventId,
      event_type: "patient.registered",
      occurred_at: new Date().toISOString(),
      patient: {
        patient_id: patientId,
        name,
        date_of_birth: dateOfBirth,
        gender,
      },
      registration: {
        registration_id: registrationId,
        visit_date: visitDate,
        clinic_code: clinicCode,
      },
      medical: normalizedMedical,
    };

    await client.query(
      `INSERT INTO outbox_events(id, event_type, payload, status)
       VALUES ($1, $2, $3::jsonb, 'pending')`,
      [eventId, "patient.registered", JSON.stringify(eventPayload)],
    );

    await client.query("COMMIT");

    res.status(201).json({
      registrationId,
      patientId,
      name,
      realtimeSummary,
      realtimeStatus,
      realtimeErrorDetail,
      outboxStatus: "pending_publish",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Registration failed", detail: error.message });
  } finally {
    client.release();
  }
});

async function bootstrap() {
  await runMigrations();
  await connectRabbit();

  setInterval(() => {
    processOutboxOnce().catch((err) => {
      console.error("[outbox] tick failed", err.message);
    });
  }, config.outboxPollMs);

  app.listen(config.port, () => {
    console.log(`Service A listening on port ${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Service A failed to start", error);
  process.exit(1);
});
