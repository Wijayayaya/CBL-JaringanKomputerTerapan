const { pool } = require("./db");
const { publishEvent } = require("./rabbit");

async function processOutboxOnce() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, payload
       FROM outbox_events
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 20
       FOR UPDATE SKIP LOCKED`
    );

    for (const row of rows) {
      await publishEvent(row.payload);
      await client.query(
        `UPDATE outbox_events
         SET status = 'sent', sent_at = NOW()
         WHERE id = $1`,
        [row.id]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[outbox] process failed", error.message);
  } finally {
    client.release();
  }
}

module.exports = { processOutboxOnce };
