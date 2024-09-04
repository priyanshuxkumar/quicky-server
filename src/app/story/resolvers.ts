import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";


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


const queries = {
  fetchUserStories: async (
    parent: any,
    { userId }: { userId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx?.user.id) {
      throw new Error("User not authenticated");
    }

    if (!userId?.length) {
      throw new Error("user not found");
    }

    const stories = await prismaClient.story.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
    if (!stories?.length) {
      return [];
    }

    return stories;
  },

  fetchStoryOfChatUsers: async (
    parent: any,
    args: any,
    ctx: GraphqlContext
  ) => {
    if (!ctx.user.id) {
      throw new Error("User is not authenticated");
    }

    const chats = await prismaClient.chat.findMany({
      where: {
        users: {
          some: {
            userId: ctx.user.id,
          },
        },
      },
      include: {
        users: true,
      },
    });

    // Create a set for unique userIds and a map for userId to chatId
    const userIdsWithChatId = new Map();
    chats.forEach((chat) => {
      chat.users.forEach((user) => {
        if (user.userId !== ctx.user.id) {
          userIdsWithChatId.set(user.userId, chat.id);
        }
      });
    });

    // Fetch users with active stories using the unique userIds
    const usersWithActiveStories = await prismaClient.user.findMany({
      where: {
        id: { in: Array.from(userIdsWithChatId.keys()) },
        stories: {
          some: {
            expiresAt: {
              gt: new Date(), // Only active stories
            },
          },
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    });

    // Attach chatId to the users
    const result = usersWithActiveStories.map((user) => ({
      ...user,
      chatId: userIdsWithChatId.get(user.id),
    }));
    return result;
  },

  getSignedUrlOfStoryMedia: async (
    parent: any,
    { mediaName, mediaType }: { mediaName: string; mediaType: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user && !ctx.user.id) {
      throw new Error("User not authenticated");
    }

    const allowesImageType = ["jpg , jpeg , png"];

    if (!allowesImageType) throw new Error("Invalid image type");

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "",
      Key: `upload/stories/${ctx.user.id}/-${Date.now()}-${mediaName}`,
    });

    const signedUrl = await getSignedUrl(s3Client, putObjectCommand);
    return signedUrl;
  },
};

const mutations = {
  createStory: async (
    parent: any,
    { mediaUrl }: { mediaUrl: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user?.id) {
      throw new Error("Unauthorized! Please login to create a story.");
    }

    let expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // stories expire after 24 hours

    await prismaClient.story.create({
      data: {
        mediaUrl,
        userId: ctx.user.id,
        expiresAt,
      },
    });
    return {
      success: true,
      message: "Story uploaded successfully",
    };
  },

  deleteStory: async (
    parent: any,
    { storyId }: { storyId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx?.user?.id) {
      throw new Error("User is not authenticated");
    }

    if (!storyId) {
      throw new Error("Story not found or already deleted");
    }

    const story = await prismaClient.story.findFirst({
      where: {
        id: storyId,
        userId: ctx.user.id,
      },
    });

    if (!story) {
      throw new Error("Story not found or already deleted");
    }

    if (story.userId != ctx.user.id) {
      throw new Error("You are not authorized to delete this story");
    }

    await prismaClient.story.delete({
      where: {
        id: storyId,
      },
    });
    return {
      success: true,
      message: "Story deleted successfully",
    };
  },
};

export const resolvers = { mutations, queries };
