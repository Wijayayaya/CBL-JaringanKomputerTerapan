const amqp = require("amqplib");
const config = require("./config");

let channel = null;
let isConnecting = false;
let isReady = false;
let reconnectTimer = null;

async function connectRabbit() {
  if (channel && isReady) {
    return { channel };
  }
  if (isConnecting) return;
  isConnecting = true;

  while (true) {
    try {
      const conn = await amqp.connect(config.rabbit.url);

      conn.on("error", (err) => {
        console.error("[rabbit] connection error", err.message);
        channel = null;
        isReady = false;
        scheduleReconnect();
      });

      conn.on("close", () => {
        console.warn("[rabbit] connection closed, reconnecting...");
        channel = null;
        isReady = false;
        scheduleReconnect();
      });

      channel = await conn.createChannel();

      channel.on("close", () => {
        channel = null;
        isReady = false;
      });

      channel.on("error", (err) => {
        console.error("[rabbit] channel error", err.message);
      });

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

      console.log("[rabbit] connected and channel ready");
      isReady = true;
      isConnecting = false;
      return { conn, channel };
    } catch (err) {
      console.error("[rabbit] failed to connect, retrying in 5s...", err.message);
      await sleep(5000);
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
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