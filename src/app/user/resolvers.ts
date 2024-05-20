import bcrypt from "bcryptjs"; // For hashing passwords
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import JWTService from "../../services/jwt";
import nodemailer from 'nodemailer';
import { graphql } from "graphql";
import { sendOTPEmail } from "../../services/emailUtils";


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

export interface createMessagePayload {
  chatId: string
  content: string
  senderId: string
  recipientId: string
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  chatId: string;
  createdAt: Date;
}

const otpStorage: {[key: string]: string} = {};


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
                        userId: id, 
                    }
                }
            },
            include: {
                users: {
                    include: {
                        user: true,
                    }
                },
                messages: {
                  orderBy: { updatedAt: 'desc' },
                  take: 1, 
                }, 
            }
        });
        return chats

    } catch (error) {
        console.error("Error fetching chats:", error);
        throw new Error("Failed to fetch chats.");
    }
    },

    fetchAllMessages: async (parent: any, { chatId }: { chatId?: string }, ctx: GraphqlContext) => {
      const id = ctx.user?.id;
      if (!id) return null;
  
      try {
          let messages : Message[] = [];
  
          if (chatId) {
              // If chatId is provided, fetch messages for that specific chat
              messages = await prismaClient.message.findMany({
                  where: {
                      chatId,
                  },
                  orderBy: {
                      createdAt: 'asc',
                  },
              });
          } else {
              // If chatId is not provided, return an empty array
              messages = [];
          }
  
          return messages ;
      } catch (error) {
          console.error('Error fetching messages:', error);
          throw new Error('Failed to fetch messages');
      }
    },
  

    getUserByUsername: async(parent: any , {username}: {username: string} , ctx: GraphqlContext) => {
      const user = await prismaClient.user.findMany({
          take: 5,
          where: {
            OR: [
              { username: { contains: username, mode: 'insensitive' } },
              { firstname: { contains: username, mode: 'insensitive' } },
              { lastname: { contains: username, mode: 'insensitive' } }
            ]
          },
          include: {
            users: {
                include: {
                    user: true,
                    chat: true
                },
            },
        }
      });
      return user;
    },

    checkUsernameIsValid: async(parent: any , {username}: {username: string} , ctx: GraphqlContext) => {
        try {
          const user = await prismaClient.user.findUnique({
              where: {
                  username: username
              }
          })
          if(!user) {
            return true
          }else{
            return false
          }
        } catch (error) {
          console.error('Error fetching user information:', error);
          return null;
        }
      
    },

    checkEmailIsValid: async(parent: any , {email}: {email: string} , ctx: GraphqlContext) => {
        try {
          const user = await prismaClient.user.findUnique({
              where: {
                  email: email
              }
          })
          if(!user) {
            return true
          }else{
            return false
          }
        } catch (error) {
          console.error('Error fetching user information:', error);
          return null;
        }
      
    }

}

const mutations = {
  registerUser: async (parent: any, { payload }: { payload: createUserPayload },ctx: GraphqlContext) => {
    try {
      const { firstname, lastname, email, username, password, avatar } = payload;

      if (!firstname || !lastname || !email || !username || !password) {
        throw new Error("Missing required fields.");
      }
      
      const isEmailTaken = await prismaClient.user.findFirst({
        where: { email },
      });

      if(isEmailTaken) {
        return { errors: [{ message: "Email is already taken!" }] };
      };

      const isUsernameTaken = await prismaClient.user.findFirst({
        where: { username },
      });

      if(isUsernameTaken) {
        throw new Error("Username is already taken!");
      }

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
    } catch (error:any) {
        console.log("Error in registerUser:" , error.message)
        if(error.message == "Email is already taken!") {
          return { errors: [{ message: "Email is already taken!" }] };
        }
        if(error.message == "Username is already taken!") {
          return { errors: [{ message: "Username is already taken!" } ] };
        }
        if(error.message == "Password must be at least 8 characters long.") {
          return { errors: [{ message: "Password must be at least 8 characters long." }] };
        }
        console.error("Error in registerUser:", error);
    }
  },

  sendOTPVerificationEmail: async(parent:any ,{email}: {email: string} , ctx: GraphqlContext) => {
     try {
        const isEmailTaken = await prismaClient.user.findFirst({
          where: {
            email
          }
        })
        if(isEmailTaken) {
          throw new Error("Account is already exists with this email!")
        }

        const OTP = (Math.floor(100000+Math.random()*900000)).toString()

        // Store the OTP temporarily
        otpStorage[email] = OTP;

        await sendOTPEmail(email, OTP)
        return {
          success: true,
          message: "OTP sent successfully!"
        }
     } catch (error:any) {
        console.error('Error in resendOTP:', error.message);
        throw new Error('Failed to resend OTP.');
     }
  },

  verifyOTP: async(parent:any , {otp , email} : {otp:string , email:string} , ctx:GraphqlContext) => {
      if(!otp || !email) {
        throw new Error("This field can't be empty!")
      }
      if(otpStorage[email] != otp) {
        throw new Error("Invalid OTP!")
      }
      return {
        success: true,
        message: "OTP verified successfully!"
      }
  },

  loginUser: async (
    parent: any,
    { payload }: { payload: loginUserPayload },
    ctx: GraphqlContext
  ) => {
    const { identifier, password } = payload;

    if (!identifier || !password) {
      throw new Error("Field must be required!");
    }

    const user = await prismaClient.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      throw new Error("User not found!");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials!");
    }

    const token = JWTService.generateTokenForUser(user);
    return { user, token };
  },

  sendMessage: async ( parent: any,{ payload }: { payload: createMessagePayload },ctx: GraphqlContext) => {
    if (!ctx.user?.id) {
      throw new Error("Unauthorized! Please login to create a chat.");
    }

    const { recipientId, content, chatId } = payload;

    // Validate required fields
    if (!recipientId) {
      throw new Error("Missing reciever ID");
    }
    if (!content) {
      throw new Error("Message content cannot be empty.");
    }

    // Check if chat exists (if provided)
    if (chatId) {
      const existingChat = await prismaClient.chat.findFirst({
        where: { id: chatId },
      });

      if (existingChat) {
        const message = await prismaClient.message.create({
          data: {
            chatId: chatId,
            content: content,
            recipientId,
            senderId: ctx.user.id,
          },
        });
        return message;
      }
    } else {
       // New chat scenario (check for existing chat based on users)
      const chat = await prismaClient.chat.findFirst({
        where: {
          users: {
            every: {
              id: {
                in: [ctx.user.id, recipientId], 
              },
            },
          },
        },
      });
      if(!chat){
      const newChat = await prismaClient.chat.create({
        data: {
          users: {
            create: [
              {
                user: {
                  connect: { id: ctx.user.id },
                },
              },
              {
                user: {
                  connect: { id: recipientId },
                },
              },
            ],
          },
        },
        include: {
          users: {
            include: {
              user: true,
            },
          },
        },
      });

      const message = await prismaClient.message.create({
        data: {
          chatId: newChat?.id,
          content: content,
          recipientId,
          senderId: ctx.user.id,
        },
      });


      if (message) {
        ctx.io.emit('receivedMessage', message); // Emit the message using the Socket.IO instance
      }
      
      return message;
    }
    }
  },

  // deleteMessages: async(parent:any , {chatId}: {chatId :string} , ctx: GraphqlContext) => {
  //   try {
  //     if(!ctx.user?.id) {
  //       throw new Error("Unauthorized! Please login to create a chat.");
  //     }

  //     const message = await prismaClient.message.findUnique({
  //       where: { chatId, senderId: ctx.user.id }
  //     });

  //     if (!message) {
  //       return { message: 'Message not found', success: false };
  //     }
      
  //     const messageDeleteRes = await prismaClient.message.updateMany({
  //       where: {
  //         chatId
  //       },
  //       data: {
  //           senderDeleted: ctx.user.id === message.senderId,
  //           recipientDeleted: ctx.user.id === message.recipientId,
  //       }
  //     });
  
  //     if (messageDeleteRes === null) {
  //       throw new Error('Message not found');
  //     }
  //     return {
  //       success: true,
  //       message: 'Messages deleted successfully',
  //     };
  //   } catch (error) {
  //     console.error('Error deleting message:', error);
  //     throw new Error('Failed to delete message');
  //   }

  // } 
};

export const resolvers = { mutations , queries };
