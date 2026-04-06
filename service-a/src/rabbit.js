const amqp = require("amqplib");
const config = require("./config");

let channel = null;
let isConnecting = false;

async function connectRabbit() {
  if (isConnecting) return;
  isConnecting = true;

  while (true) {
    try {
      const conn = await amqp.connect(config.rabbit.url);

      conn.on("error", (err) => {
        console.error("[rabbit] connection error", err.message);
        channel = null;
        scheduleReconnect();
      });

      conn.on("close", () => {
        console.warn("[rabbit] connection closed, reconnecting...");
        channel = null;
        scheduleReconnect();
      });

      channel = await conn.createChannel();
      // Tidak assertQueue di sini — Service B yang bertanggung jawab
      // declare queue lengkap dengan DLX

      console.log("[rabbit] connected and channel ready");
      isConnecting = false;
      return { conn, channel };
    } catch (err) {
      console.error("[rabbit] failed to connect, retrying in 5s...", err.message);
      await sleep(5000);
    }
  }
}

function scheduleReconnect() {
  if (isConnecting) return;
  isConnecting = true;
  setTimeout(() => {
    isConnecting = false;
    connectRabbit().catch((err) => {
      console.error("[rabbit] reconnect error", err.message);
    });
  }, 5000);
}

async function publishEvent(payload) {
  if (!channel) {
    throw new Error("RabbitMQ channel not ready");
  }
  const message = Buffer.from(JSON.stringify(payload));
  channel.sendToQueue(config.rabbit.queue, message, { persistent: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { connectRabbit, publishEvent };