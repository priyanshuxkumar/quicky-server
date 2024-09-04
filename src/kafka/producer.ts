import { Producer } from "kafkajs";
import {kafka } from "./kafka_config";

interface sendMessageProp {
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: number;
  chatId?: string;
  shareMediaUrl?: string;
  storyId?: string;
}


let producer:null | Producer = null;

export async function createProducer() {
  if (producer) return producer;
    const _producer = kafka.producer();
    await _producer.connect();
    producer = _producer;
    return producer;
}


export const produceMessage = async ({senderId ,recipientId, content , chatId , shareMediaUrl , storyId ,createdAt}: sendMessageProp) => {
  const producer = await createProducer();
  await producer.send({
    topic: "_MESSAGES",
    messages: [
      {
        value: JSON.stringify({ senderId, recipientId, content ,chatId , shareMediaUrl , storyId , createdAt}),
      },
    ],
  });
  return true;
};
