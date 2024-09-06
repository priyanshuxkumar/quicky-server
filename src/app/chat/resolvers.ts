import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import redisClient from "../../services/redisClient";

//AWS
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

export interface createMessagePayload {
  chatId: string;
  content: string;
  senderId: string;
  recipientId: string;
  storyId?: string;
  shareMediaUrl?: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  chatId: string;
  createdAt: Date;
}

const queries = {
  fetchAllChats: async (parent: any, args: any, ctx: GraphqlContext) => {
    const cacheKey = `chats:${ctx.user?.id}`;
    const cacheValue = await redisClient.get(cacheKey);

    if (cacheValue) {
      console.log("cached");
      // return JSON.parse(cacheValue);
    }

    const id = ctx.user?.id;
    if (!id) return null;

    try {
      // Fetch all chats for the authenticated user
      const chats = await prismaClient.chat.findMany({
        where: {
          users: {
            some: {
              userId: id,
            },
          },
        },
        include: {
          users: {
            include: {
              user: true,
            },
          },
          messages: {
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });

      await redisClient.set(cacheKey, JSON.stringify(chats), { EX: 5 });

      return chats;
    } catch (error) {
      console.error("Error fetching chats:", error);
      throw new Error("Failed to fetch chats.");
    }
  },

  fetchAllMessages: async (
    parent: any,
    {
      chatId,
      recipientId,
      limit,
      offset,
    }: { chatId: string; recipientId: string; limit: number; offset: number },
    ctx: GraphqlContext
  ) => {
    const cacheKey = `messages:${chatId}`;
    const cacheValue = await redisClient.get(cacheKey);

    if (cacheValue) {
      // return JSON.parse(cacheValue)
      console.log("done cache");
    }

    const id = ctx.user?.id;
    if (!id) return null;

    try {
      let messages: any = [];

      if (chatId && recipientId) {
        messages = await prismaClient.message.findMany({
          where: {
            chatId,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            story: {
              select: {
                mediaUrl: true,
              },
            },
          },
          take: limit + 1,
          skip: offset,
        });
      } else if (recipientId) {
        messages = await prismaClient.message.findMany({
          where: {
            OR: [
              { senderId: id, recipientId: recipientId },
              { senderId: recipientId, recipientId: id },
            ],
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            story: true,
          },
          take: limit + 1,
          skip: offset,
        });
      } else {
        messages = [];
      }

      await redisClient.set(cacheKey, JSON.stringify(messages), { EX: 5 });
      return messages;
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw new Error("Failed to fetch messages");
    }
  },

  getSignedUrlOfChat: async (
    parent: any,
    { imageName, imageType }: { imageName: string; imageType: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user && !ctx.user.id) {
      throw new Error("User not authenticated");
    }

    const allowesImageType = ["jpg , jpeg , png"];

    if (!allowesImageType) throw new Error("Invalid image type");

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "",
      Key: `upload/chat/${ctx.user.id}/-${Date.now()}-${imageName}`,
    });
    const signedUrl = await getSignedUrl(s3Client, putObjectCommand);
    return signedUrl;
  },

  getSignedUrlOfSharedMedia: async (
    parent: any,
    {
      shareMediaName,
      shareMediaType,
    }: { shareMediaName: string; shareMediaType: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user && !ctx.user.id) {
      throw new Error("User not authenticated");
    }

    const allowesImageType = ["jpg , jpeg , png"];

    if (!allowesImageType) throw new Error("Invalid image type");

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "",
      Key: `upload/shared-media/${
        ctx.user.id
      }/-${Date.now()}-${shareMediaName}`,
    });

    const signedUrl = await getSignedUrl(s3Client, putObjectCommand);
    return signedUrl;
  },

  fetchSharedMediaOfChat: async (
    parent: any,
    { chatId }: { chatId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user && !ctx.user.id) {
      throw new Error("User not authenticated");
    }

    const media = await prismaClient.message.findMany({
      where: {
        chatId,
        shareMediaUrl: {
          not: '',
        },
      },
    });

    return media;
  },
};

const mutations = {
  updateMsgSeenStatus: async (
    parent: any,
    { chatId }: { chatId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user?.id) {
      throw new Error("Unauthorized! Please login to update seen status");
    }

    const chat = await prismaClient.message.updateMany({
      where: {
        chatId: chatId,
        isSeen: false,
      },
      data: {
        isSeen: true,
      },
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    return {
      success: true,
      message: "Message seen status changed successfully",
    };
  },
};

export const resolvers = { mutations, queries };
