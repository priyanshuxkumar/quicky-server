import bcrypt from "bcryptjs"; // For hashing passwords
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import JWTService from "../../services/jwt";
import { Chat } from "@prisma/client";


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
  password: string
}

export interface createChatPayload {
  recieverId: string
}

export interface createMessagePayload {
  chatId: string
  content: string
  senderId: string
  recipientId: string
}

const queries = {
    getCurrentUser: async(parent: any , args: any , ctx: GraphqlContext) => {
      const id = ctx.user?.id
      if(!id) return null
      
      const user = await prismaClient.user.findUnique({
        where: {
            id: id
        },
      });

      if(!user){
        throw new Error("User not found")
      }
      return user;
    },

    fetchAllChats: async(parent: any, args: any, ctx: GraphqlContext) =>{
      const id = ctx.user?.id
      if(!id) return null

      try {
        // Fetch all chats for the authenticated user
        const chats = await prismaClient.chat.findMany({
            where: {
                users: {
                    some: {
                        userId: id, // Filter chats where the user is a participant
                    }
                }
            },
            include: {
                users: {
                    include: {
                        user: true, // Include User data for each participant
                    }
                },
                messages: true, // Include Messages in each chat
            }
        });

        // Debugging: Inspect the query results
        console.log("Fetched chats:", JSON.stringify(chats, null, 2));
        return chats;
    } catch (error) {
        console.error("Error fetching chats:", error);
        throw new Error("Failed to fetch chats.");
    }
    },

    fetchAllMessages: async(parent: any,{ chatId }: { chatId: string},ctx: GraphqlContext) => {
      const id = ctx.user?.id
      if(!id) return null

      try {
        const messages = await prismaClient.message.findMany({
            where: {
                chatId,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        return messages;

      } catch (error) {
        console.error('Error fetching messages:', error);
        throw new Error('Failed to fetch messages');
      }
    },
}

const mutations = {
    registerUser: async (
      parent: any,
      { payload }: { payload: createUserPayload },
      ctx: GraphqlContext
    ) => {
      const { firstname, lastname, email, username, password , avatar } = payload;

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prismaClient.user.create({
        data: {
          firstname,
          lastname,
          email,
          username,
          avatar,
          password: hashedPassword,
        },
      });

      return newUser;
    },
    loginUser: async(parent: any,
      { payload }: { payload: loginUserPayload },
      ctx: GraphqlContext) =>{
        const {identifier , password} = payload;

        if(!identifier || !password){
          throw new Error("Field must be required!")
        };

        const user = await prismaClient.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { username: identifier },
            ],
          },
        });
  
        if(!user){
          throw new Error("User not found!")
        }

        const isPasswordValid = await bcrypt.compare(password , user.password)
        if(!isPasswordValid){
           throw new Error("Invalid credentials!")
        }

        const token = JWTService.generateTokenForUser(user)
        return {user , token};
    },
    createChat: async (parent: any, { payload }: { payload: createChatPayload }, ctx: GraphqlContext) => {
      if (!ctx.user?.id) {
        throw new Error("Unauthorized! Please login to create a chat.");
      };

      const { recieverId } = payload;

      if (!recieverId) {
        throw new Error("Failed to fetch Chat")
      }

      // Check if a chat between the users already exists
      const existingChat = await prismaClient.chat.findFirst({
        where: {
            AND: [
                { users: { some: { userId: ctx.user.id } } },
                { users: { some: { userId: recieverId } } },
            ],
        },
        include: {
            users: {
              include: {
                user: true,
              }
            }
        },
        });

        if (existingChat) {
            return existingChat;
        }

      const newChat = await prismaClient.chat.create({
        data: {
            users: {
                create: [
                    {
                        user: {
                            connect: { id: ctx.user.id },
                        }
                    },
                    {
                        user: {
                            connect: { id: recieverId },
                        }
                    }
                ]
            },
        },
        include: {
          users: {
            include: {
              user: true,
            },
          }  
        },
      });

      return newChat;
    },

    createMessage: async(parent: any,{ payload }: { payload: createMessagePayload },ctx: GraphqlContext)=>{

      if (!ctx.user?.id) {
          throw new Error("Unauthorized! Please login to create a chat.");
      };

      const {recipientId , content, chatId } = payload;

      if(!recipientId || !content?.length || !chatId) {
          throw new Error("Unable to send message")
      };

      const message = await prismaClient.message.create({
          data: {
              chatId,
              content,
              recipientId,
              senderId: ctx.user.id,
          }
      })

      return message;
  }
};

export const resolvers = { mutations , queries };
