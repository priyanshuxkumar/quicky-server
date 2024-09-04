import { prismaClient } from "../clients/db";
import {kafka} from "./kafka_config";

const consumer = kafka.consumer({ groupId: 'chat-group' });

export const consumeMessages = async() => {
    await consumer.connect();
    console.log("consumer connected succesfully!");

    await consumer.subscribe({topic: '_MESSAGES' , fromBeginning: true});

    await consumer.run({
        autoCommit:true,
        eachMessage: async({ message , pause }:any) => {
            if(!message.value) return;
            const {senderId , recipientId , content , chatId , shareMediaUrl , storyId, createdAt} = JSON.parse(message?.value.toString());
            try {
                const createdAtDate = createdAt ? new Date(createdAt) : new Date();
                if(chatId){
                    const existingChat = await prismaClient.chat.findFirst({
                        where: { id: chatId },
                    });
    
                    if(existingChat){
                        await prismaClient.message.create({
                            data: {
                                chatId,
                                content,
                                recipientId,
                                senderId,
                                shareMediaUrl,
                                storyId,
                                createdAt: createdAtDate
                            }
                        })
                    }else{
                        throw new Error("Chat doesn't exist or already deleted!");
                    }
                }else{
                    const chat = await prismaClient.chat.create({
                      data: {
                        users: {
                          create: [
                            { user: { connect: { id: senderId } } },
                            {
                              user: {
                                connect: { id: recipientId },
                              },
                            },
                          ],
                        },
                      },
                    });
                    if(chat){
                        await prismaClient.message.create({
                        data: {
                            chatId : chat.id,
                            content,
                            recipientId,
                            senderId,
                            shareMediaUrl,
                            storyId,
                            createdAt: createdAtDate
                        }
                    })
                    }
                }
            } catch (error) {
                console.error(error);
                pause();
                setTimeout(() => {
                consumer.resume([{ topic: "MESSAGES" }]);
                }, 60 * 1000);
            }

        }
    })
};