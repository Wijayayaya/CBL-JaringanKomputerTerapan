const express = require("express");
const { pool } = require("./db");

const router = express.Router();

// GET /medical-records — list semua rekam medis
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, patient_id, patient_name, status, notes, diagnosis, last_visit_at, created_at, updated_at
       FROM medical_records
       ORDER BY created_at DESC`
    );
    res.json({ total: rows.length, records: rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch records", detail: error.message });
  }
});

// GET /medical-records/:patientId
router.get("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  try {
    const recordRes = await pool.query(
      `SELECT id, patient_id, patient_name, status, notes, diagnosis, last_visit_at, created_at, updated_at
       FROM medical_records WHERE patient_id = $1`,
      [patientId]
    );

    if (recordRes.rows.length === 0) {
      return res.status(404).json({ message: "Medical record not found" });
    }

    const record = recordRes.rows[0];

    const allergyRes = await pool.query(
      `SELECT id, code, label, is_critical, created_at
       FROM allergies WHERE patient_id = $1
       ORDER BY is_critical DESC, created_at ASC`,
      [patientId]
    );

    const visitRes = await pool.query(
      `SELECT id, visit_date, clinic_code, doctor_notes, diagnosis, created_at
       FROM visit_history WHERE patient_id = $1
       ORDER BY visit_date DESC`,
      [patientId]
    );

    res.json({ ...record, allergies: allergyRes.rows, visit_history: visitRes.rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch medical record", detail: error.message });
  }
});

// PATCH /medical-records/:patientId
router.patch("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  const { notes, diagnosis, status } = req.body;

  const allowedStatus = ["draft", "active", "archived"];
  if (status && !allowedStatus.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${allowedStatus.join(", ")}` });
  }

  try {
    const result = await pool.query(
      `UPDATE medical_records
       SET notes = COALESCE($1, notes), diagnosis = COALESCE($2, diagnosis),
           status = COALESCE($3, status), updated_at = NOW()
       WHERE patient_id = $4 RETURNING *`,
      [notes ?? null, diagnosis ?? null, status ?? null, patientId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Medical record not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to update medical record", detail: error.message });
  }
});

// POST /medical-records/:patientId/allergies
router.post("/:patientId/allergies", async (req, res) => {
  const { patientId } = req.params;
  const { code, label, is_critical } = req.body;
  if (!code || !label) return res.status(400).json({ message: "code and label are required" });
  try {
    const result = await pool.query(
      `INSERT INTO allergies (patient_id, code, label, is_critical)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (patient_id, code)
       DO UPDATE SET label = EXCLUDED.label, is_critical = EXCLUDED.is_critical
       RETURNING *`,
      [patientId, code, label, Boolean(is_critical)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to add allergy", detail: error.message });
  }
});

// DELETE /medical-records/:patientId/allergies/:allergyId
router.delete("/:patientId/allergies/:allergyId", async (req, res) => {
  const { patientId, allergyId } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM allergies WHERE id = $1 AND patient_id = $2 RETURNING id`,
      [allergyId, patientId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Allergy not found" });
    res.json({ message: "Allergy deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete allergy", detail: error.message });
  }
});

// POST /medical-records/:patientId/visits
router.post("/:patientId/visits", async (req, res) => {
  const { patientId } = req.params;
  const { visit_date, clinic_code, doctor_notes, diagnosis } = req.body;
  if (!visit_date || !clinic_code) return res.status(400).json({ message: "visit_date and clinic_code are required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const visitResult = await client.query(
      `INSERT INTO visit_history (patient_id, visit_date, clinic_code, doctor_notes, diagnosis)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [patientId, visit_date, clinic_code, doctor_notes ?? null, diagnosis ?? null]
    );
    await client.query(
      `UPDATE medical_records SET last_visit_at = $1, status = 'active', updated_at = NOW()
       WHERE patient_id = $2`,
      [visit_date, patientId]
    );
    await client.query("COMMIT");
    res.status(201).json(visitResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to add visit", detail: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;