const amqp = require("amqplib");
const config = require("./config");

let channel;

async function connectRabbit() {
  const conn = await amqp.connect(config.rabbit.url);
  channel = await conn.createChannel();
  await channel.assertQueue(config.rabbit.queue, { durable: true });
  return { conn, channel };
}

async function publishEvent(payload) {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  const message = Buffer.from(JSON.stringify(payload));
  channel.sendToQueue(config.rabbit.queue, message, { persistent: true });
}

module.exports = {
  connectRabbit,
  publishEvent
};
