const amqp = require("amqplib");
const config = require("./config");
const { pool } = require("./db");

let isStarting = false;
let isRunning = false;
let reconnectTimer = null;

async function processRegisteredEvent(payload) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const eventId = payload.event_id;
    const patientId = payload.patient.patient_id;
    const patientName = payload.patient.name || null;

    const exists = await client.query(
      `SELECT event_id FROM processed_events WHERE event_id = $1`,
      [eventId]
    );

    if (exists.rows.length > 0) {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `INSERT INTO medical_records(patient_id, patient_name, status, last_visit_at, updated_at)
       VALUES ($1, $2, 'draft', NOW(), NOW())
       ON CONFLICT (patient_id)
       DO UPDATE SET updated_at = EXCLUDED.updated_at,
                     last_visit_at = EXCLUDED.last_visit_at,
                     patient_name = COALESCE(EXCLUDED.patient_name, medical_records.patient_name)`,
      [patientId, patientName]
    );

    await client.query(
      `INSERT INTO processed_events(event_id) VALUES ($1)`,
      [eventId]
    );

    await client.query("COMMIT");
    console.log(`[consumer] rekam medis dibuat untuk: ${patientName} (${patientId})`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function startConsumer() {
  if (isStarting || isRunning) {
    return;
  }

  isStarting = true;

  while (true) {
    try {
      const conn = await amqp.connect(config.rabbit.url);

      conn.on("error", (err) => {
        console.error("[consumer] connection error", err.message);
      });

      conn.on("close", () => {
        isRunning = false;
        console.warn("[consumer] connection closed, reconnecting in 5s...");
        scheduleReconnect();
      });

      const channel = await conn.createChannel();

      await channel.assertExchange(config.rabbit.dlx, "direct", { durable: true });
      await channel.assertQueue(config.rabbit.dlq, { durable: true });
      await channel.bindQueue(config.rabbit.dlq, config.rabbit.dlx, config.rabbit.queue);

      await channel.assertQueue(config.rabbit.queue, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": config.rabbit.dlx,
          "x-dead-letter-routing-key": config.rabbit.queue,
        },
      });

      await channel.prefetch(10);

      channel.consume(config.rabbit.queue, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString("utf8"));
          await processRegisteredEvent(payload);
          channel.ack(msg);
        } catch (error) {
          console.error("[consumer] processing failed, sending to DLQ:", error.message);
          channel.nack(msg, false, false);
        }
      });

      console.log(`[consumer] consuming queue "${config.rabbit.queue}", DLQ: "${config.rabbit.dlq}"`);
      isStarting = false;
      isRunning = true;
      return;
    } catch (err) {
      console.error("[consumer] failed to connect, retrying in 5s...", err.message);
      await sleep(5000);
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startConsumer().catch((err) => {
      console.error("[consumer] reconnect error", err.message);
    });
  }, 5000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { startConsumer };