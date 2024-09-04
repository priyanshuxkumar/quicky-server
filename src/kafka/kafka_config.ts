import { Kafka } from "kafkajs";

export const kafka = new Kafka({
  clientId: "quicky",
  brokers: ["localhost:9092"],
});
