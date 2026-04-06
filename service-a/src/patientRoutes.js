const express = require("express");
const { pool } = require("./db");

const router = express.Router();

// GET /patients — list semua pasien beserta data registrasi terakhir
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.date_of_birth,
         p.gender,
         p.created_at,
         r.id           AS registration_id,
         r.visit_date,
         r.clinic_code,
         r.requires_realtime_validation
       FROM patients p
       LEFT JOIN LATERAL (
         SELECT id, visit_date, clinic_code, requires_realtime_validation
         FROM registrations
         WHERE patient_id = p.id
         ORDER BY created_at DESC
         LIMIT 1
       ) r ON true
       ORDER BY p.created_at DESC`
    );
    res.json({ total: rows.length, patients: rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch patients", detail: error.message });
  }
});

module.exports = router;