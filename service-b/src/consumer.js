const amqp = require("amqplib");
const config = require("./config");
const { pool } = require("./db");

async function processRegisteredEvent(payload) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const eventId = payload.event_id;
    const patientId = payload.patient.patient_id;

    const exists = await client.query(
      `SELECT event_id FROM processed_events WHERE event_id = $1`,
      [eventId]
    );

    if (exists.rows.length > 0) {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `INSERT INTO medical_records(patient_id, status, last_visit_at, updated_at)
       VALUES ($1, 'draft', NOW(), NOW())
       ON CONFLICT (patient_id)
       DO UPDATE SET updated_at = EXCLUDED.updated_at, last_visit_at = EXCLUDED.last_visit_at`,
      [patientId]
    );

    await client.query(
      `INSERT INTO processed_events(event_id) VALUES ($1)`,
      [eventId]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function startConsumer() {
  const conn = await amqp.connect(config.rabbit.url);
  const channel = await conn.createChannel();

  await channel.assertQueue(config.rabbit.queue, { durable: true });

  await channel.prefetch(10);

  channel.consume(config.rabbit.queue, async (msg) => {
    if (!msg) {
      return;
    }

    try {
      const payload = JSON.parse(msg.content.toString("utf8"));
      await processRegisteredEvent(payload);
      channel.ack(msg);
    } catch (error) {
      console.error("[consumer] processing failed", error.message);
      channel.nack(msg, false, false);
    }
  });

  console.log(`Service B consuming queue ${config.rabbit.queue}`);
}

module.exports = { startConsumer };
