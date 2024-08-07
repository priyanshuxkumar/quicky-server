import bcrypt from "bcryptjs"; // For hashing passwords
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

export interface createUserPayload {
  firstname: string;
  lastname?: string;
  email: string;
  avatar: string;
  password: string;
  username: string;
}

export interface loginUserPayload {
  identifier: string;
  password: string;
}

interface updateUserProfileDetailsPayload {
  firstname: string;
  lastname: string;
  username: string;
  avatar: string;
}

const queries = {
  getCurrentUser: async (parent: any, args: any, ctx: GraphqlContext) => {
    const cacheKey = `user:${ctx.user?.id}`;
    const cacheValue = await redisClient.get(cacheKey);

    if (cacheValue) {
      return JSON.parse(cacheValue);
    }

    const id = ctx.user?.id;
    if (!id) return null;

    const user = await prismaClient.user.findUnique({
      where: {
        id: id,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    await redisClient.set(cacheKey, JSON.stringify(user), { EX: 60 });
    return user;
  },

  getUserByUsername: async (
    parent: any,
    { username }: { username: string },
    ctx: GraphqlContext
  ) => {
    const cacheKey = `userProfile:${username}`;
    const cacheValue = await redisClient.get(cacheKey);

    if (cacheValue) {
      return JSON.parse(cacheValue);
    }
    try {
      const user = await prismaClient.user.findMany({
        take: 5,
        where: {
          OR: [
            { username: { contains: username, mode: "insensitive" } },
            { firstname: { contains: username, mode: "insensitive" } },
            { lastname: { contains: username, mode: "insensitive" } },
          ],
        },
        include: {
          users: {
            include: {
              user: true,
              chat: true,
            },
          },
        },
      });
      await redisClient.set(cacheKey, JSON.stringify(user), { EX: 60 });
      return user;
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw new Error("Failed to fetch user data");
    }
  },

  checkUsernameIsValid: async (
    parent: any,
    { username }: { username: string },
    ctx: GraphqlContext
  ) => {
    if (!username) {
      throw new Error("Username is required");
    }

    const cacheKey = `isUsernameUnique:${username}`;
    const cacheValue = await redisClient.get(cacheKey);

    if (cacheValue !== null) {
      return JSON.parse(cacheValue);
    }

    try {
      const user = await prismaClient.user.findUnique({
        where: {
          username: username,
        },
      });
      const isUnique = !user;

      await redisClient.set(cacheKey, JSON.stringify(isUnique), { EX: 60 });

      return isUnique;
    } catch (error) {
      console.error("Error fetching user information:", error);
      throw new Error("Failed to check username validity.");
    }
  },

  checkEmailIsValid: async (
    parent: any,
    { email }: { email: string },
    ctx: GraphqlContext
  ) => {
    try {
      const user = await prismaClient.user.findUnique({
        where: {
          email: email,
        },
      });
      if (!user) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error fetching user information:", error);
      return null;
    }
  },

  getSignedUrlOfAvatar: async (
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
      Key: `upload/avatar/${ctx.user.id}/-${Date.now()}-${imageName}`,
    });
    const signedUrl = await getSignedUrl(s3Client, putObjectCommand);
    return signedUrl;
  },

  
};

const mutations = {
  updateUserProfileDetails: async (
    parent: any,
    { payload }: { payload: updateUserProfileDetailsPayload },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user?.id) {
      throw new Error("Unauthorized! Please login to update details");
    }

    const { firstname, lastname, username, avatar } = payload;

    if (!firstname && !lastname && !username && !avatar) {
      throw new Error("Missing required fields");
    }

    const updatedUser = await prismaClient.user.update({
      where: { id: ctx.user.id },
      data: { firstname, lastname, username, avatar },
    });

    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  },

  changePassword: async (
    parent: any,
    {
      oldPassword,
      newPassword,
      confirmPassword,
    }: { oldPassword: string; newPassword: string; confirmPassword: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user?.id) {
      throw new Error("Unauthorized! Please login to change password");
    }
    console.log(ctx.user.password);

    if (newPassword != confirmPassword) {
      throw new Error("New password and confirm password do not match");
    }

    const user = await prismaClient.user.findFirst({
      where: { id: ctx.user.id },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user?.password);

    if (!isPasswordValid) {
      throw new Error("Old password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prismaClient.user.update({
      where: { id: ctx.user.id },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  },

 
};

export const resolvers = { mutations, queries };
