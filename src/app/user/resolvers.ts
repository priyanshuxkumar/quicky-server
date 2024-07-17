import bcrypt from "bcryptjs"; // For hashing passwords
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import JWTService from "../../services/jwt";
import { sendOTPEmail } from "../../services/emailUtils";
import  redisClient   from "../../services/redisClient"


//AWS
import {S3Client , PutObjectCommand} from "@aws-sdk/client-s3"
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"

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
  password: string
}

export interface createMessagePayload {
  chatId: string
  content: string
  senderId: string
  recipientId: string
  storyId? : string
  shareMediaUrl? : string
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  chatId: string;
  createdAt: Date;
}

interface updateUserProfileDetailsPayload {
  firstname: string;
  lastname: string;
  username: string;
  avatar:string
}



const otpStorage: {[key: string]: string} = {};

const queries = {
    getCurrentUser: async(parent: any , args: any , ctx: GraphqlContext) => {
      const cacheKey = `user:${ctx.user?.id}`;
      const cacheValue = await redisClient.get(cacheKey);

      if (cacheValue) {
        return JSON.parse(cacheValue);
      }

      const id = ctx.user?.id
      if(!id) return null
      
      const user = await prismaClient.user.findUnique({
        where: {
            id: id
        },
      });

      if(!user){
        throw new Error("User not found")
      };

      await redisClient.set(cacheKey , JSON.stringify(user) , {'EX': 60});
      return user;
    },

    fetchAllChats: async(parent: any, args: any, ctx: GraphqlContext) =>{
      const cacheKey = `chats:${ctx.user?.id}`;
      const cacheValue = await redisClient.get(cacheKey);

      if (cacheValue) {
        console.log("cached")
        // return JSON.parse(cacheValue);
      };

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

        await redisClient.set(cacheKey, JSON.stringify(chats), {'EX': 5});

        return chats

    } catch (error) {
        console.error("Error fetching chats:", error);
        throw new Error("Failed to fetch chats.");
    }
    },

    fetchAllMessages: async (parent: any, { chatId , recipientId , limit , offset}: { chatId: string , recipientId: string , limit: number , offset: number}, ctx: GraphqlContext) => {
      const cacheKey = `messages:${chatId}`;
      const cacheValue = await redisClient.get(cacheKey);

      if(cacheValue){
        // return JSON.parse(cacheValue)
        console.log("done cache")
      };

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
                      createdAt: 'desc',
                  },
                  include: {
                    story: {
                      select: {
                        mediaUrl: true
                      }
                    }
                  },
                  take: limit+1,
                  skip: offset,
              });
          } else if(recipientId) {
              messages = await prismaClient.message.findMany({
                where: {
                    OR: [
                        { senderId: id, recipientId: recipientId },
                        { senderId: recipientId, recipientId: id },
                    ],
                  },
                  orderBy: {
                      createdAt: 'desc',
                  },
                  include: {
                    story: true
                  },
                  take: limit+1,
                  skip: offset,
            })
          }else {
            messages = [];
          };

          await redisClient.set(cacheKey , JSON.stringify(messages) , {'EX' : 5})
          return messages;
      } catch (error) {
          console.error('Error fetching messages:', error);
          throw new Error('Failed to fetch messages');
      }
    },
  
    getUserByUsername: async(parent: any , {username}: {username: string} , ctx: GraphqlContext) => {
      const cacheKey = `userProfile:${username}`;
      const cacheValue =  await redisClient.get(cacheKey);

      if(cacheValue){
        return JSON.parse(cacheValue)
      };
      try {
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
        await redisClient.set(cacheKey, JSON.stringify(user) , {'EX' : 60})
        return user; 
      } catch (error) {
        console.error("Error fetching user data:", error);
        throw new Error("Failed to fetch user data");
      }
    },

    checkUsernameIsValid: async(parent: any , {username}: {username: string} , ctx: GraphqlContext) => {
      if(!username) {
        throw new Error("Username is required")
      };


      const cacheKey = `isUsernameUnique:${username}`
      const cacheValue = await redisClient.get(cacheKey);

      if(cacheValue !== null ){
         return JSON.parse(cacheValue)
      };

        try {

          const user = await prismaClient.user.findUnique({
              where: {
                  username: username
              }
          });
          const isUnique = !user
          
          await redisClient.set(cacheKey, JSON.stringify(isUnique), {'EX': 60});

          return isUnique;
          
        } catch (error) {
          console.error('Error fetching user information:', error);
          throw new Error("Failed to check username validity.");
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
      
    },

    getSignedUrlOfChat: async(parent: any , {imageName , imageType}:{imageName:string , imageType:string} , ctx:GraphqlContext)=> {
      if(!ctx.user && !ctx.user.id) {
        throw new Error("User not authenticated")
      }

      const allowesImageType = ['jpg , jpeg , png'] 

      if(!allowesImageType) throw new Error("Invalid image type")

      const putObjectCommand = new PutObjectCommand(
        {
          Bucket: process.env.S3_BUCKET_NAME || "",
          Key: `upload/chat/${ctx.user.id}/-${Date.now()}-${imageName}`,
        }
      );
      const signedUrl = await getSignedUrl(s3Client , putObjectCommand)
      return signedUrl;
      
    },

    getSignedUrlOfAvatar: async(parent: any, {imageName, imageType}: {imageName: string , imageType: string}, ctx: GraphqlContext) => {
        if(!ctx.user && !ctx.user.id){
            throw new Error("User not authenticated")
        };

        const allowesImageType = ['jpg , jpeg , png']

        if(!allowesImageType) throw new Error("Invalid image type")

        const putObjectCommand = new PutObjectCommand(
          {
            Bucket: process.env.S3_BUCKET_NAME || "",
            Key: `upload/avatar/${ctx.user.id}/-${Date.now()}-${imageName}`,
          }
        );
        const signedUrl = await getSignedUrl(s3Client, putObjectCommand)
        return signedUrl;

    },

    fetchUserStories: async(parent:any , {userId}: {userId:string} , ctx:GraphqlContext) => {
       if(!ctx?.user.id) {
          throw new Error("User not authenticated")
       }

       if(!userId?.length){
          throw new Error("user not found")
       }

       const stories = await prismaClient.story.findMany({
          where : {
            userId,
            expiresAt: {
              gt: new Date()
            }
          },
          include: {
            user: true
          }
       })
       if(!stories?.length){
          return []
       }

       return stories;
    },

    fetchStoryOfChatUsers: async(parent:any , args:any , ctx:GraphqlContext) => {
      if(!ctx.user.id){
        throw new Error("User is not authenticated")
      };

      const chats = await prismaClient.chat.findMany({
        where: {
          users: {
            some: {
              userId: ctx.user.id
            }
          }
        },
        include: {
          users: true,
        },
      });

      // Create a set for unique userIds and a map for userId to chatId
      const userIdsWithChatId = new Map();
      chats.forEach(chat => {
        chat.users.forEach(user => {
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
      const result = usersWithActiveStories.map(user => ({
        ...user,
        chatId: userIdsWithChatId.get(user.id),
      }));
      return result;
    },

    getSignedUrlOfStoryMedia: async(parent: any, {mediaName, mediaType}: {mediaName: string, mediaType: string}, ctx: GraphqlContext) => {
      if(!ctx.user && !ctx.user.id){
        throw new Error("User not authenticated")
      };

      const allowesImageType = ['jpg , jpeg , png']

      if(!allowesImageType) throw new Error("Invalid image type")

      const putObjectCommand = new PutObjectCommand(
        {
          Bucket: process.env.S3_BUCKET_NAME || "",
          Key: `upload/stories/${ctx.user.id}/-${Date.now()}-${mediaName}`,
        }
      );

      const signedUrl = await getSignedUrl(s3Client, putObjectCommand)
      return signedUrl;
    },

    getSignedUrlOfSharedMedia: async(parent: any, {shareMediaName, shareMediaType}: {shareMediaName: string, shareMediaType: string}, ctx: GraphqlContext) => {
      if(!ctx.user && !ctx.user.id){
        throw new Error("User not authenticated")
      };

      const allowesImageType = ['jpg , jpeg , png']

      if(!allowesImageType) throw new Error("Invalid image type")

      const putObjectCommand = new PutObjectCommand(
        {
          Bucket: process.env.S3_BUCKET_NAME || "",
          Key: `upload/shared-media/${ctx.user.id}/-${Date.now()}-${shareMediaName}`,
        }
      );

      const signedUrl = await getSignedUrl(s3Client, putObjectCommand)
      return signedUrl;
    },

    fetchSharedMediaOfChat: async(parent: any, {chatId}: {chatId: string}, ctx: GraphqlContext) => {
      if(!ctx.user && !ctx.user.id){
        throw new Error("User not authenticated")
      };

      const media = await prismaClient.message.findMany({
        where: {
          chatId,
          shareMediaUrl: {
              not: null
          }
        }
      });
      
      return media;
    }
};

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

    const { recipientId, content, chatId , storyId , shareMediaUrl} = payload;

    // Validate required fields
    if (!recipientId) {
      throw new Error("Missing reciever ID");
    }
    if (!content && !shareMediaUrl?.length) {
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
            storyId,
            shareMediaUrl
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
          storyId,
          shareMediaUrl
        },
      });

      console.log('Before:', message);

      if (message) {
        ctx.io.emit('receivedMessage', message);
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

  // },
  
  updateUserProfileDetails: async (parent: any , {payload} : {payload: updateUserProfileDetailsPayload}, ctx: GraphqlContext) => {
    if(!ctx.user?.id){
      throw new Error("Unauthorized! Please login to update details");
    }

    const {firstname, lastname, username, avatar} = payload;

    if(!firstname && !lastname && !username && !avatar) {
      throw new Error("Missing required fields");
    }

    const updatedUser = await prismaClient.user.update({
      where: { id: ctx.user.id },
      data: { firstname, lastname, username, avatar },
    });

    if(!updatedUser){
      throw new Error("User not found");
    }
    return updatedUser;
  },

  changePassword: async(parent:any, {oldPassword, newPassword , confirmPassword}: {oldPassword:string, newPassword:string , confirmPassword:string} , ctx: GraphqlContext) => {
    if(!ctx.user?.id){
      throw new Error("Unauthorized! Please login to change password");
    }
    console.log(ctx.user.password)

    if(newPassword != confirmPassword) {
      throw new Error("New password and confirm password do not match");
    }

    const user = await prismaClient.user.findFirst({
      where: { id: ctx.user.id },
    });

    if(!user){
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user?.password);
    
    if(!isPasswordValid) {
      throw new Error("Old password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword,10)

    await prismaClient.user.update({
      where: { id: ctx.user.id },
      data: { password: hashedPassword},
    })

    return {
      success: true,
      message: "Password changed successfully"
    }
  },

  updateMsgSeenStatus:async(parent:any , {chatId} : {chatId:string}, ctx: GraphqlContext) => {
    if (!ctx.user?.id) {
      throw new Error("Unauthorized! Please login to update seen status");
    }

    const chat = await prismaClient.message.updateMany({
      where: { 
        chatId: chatId ,
        isSeen:false
      },
      data: {
        isSeen: true
      } 
    });

    if(!chat){
      throw new Error("Chat not found");
    };
    
    return {
      success: true,
      message: "Message seen status changed successfully"
    }
  },

  createStory: async (parent:any, {mediaUrl}: {mediaUrl: string}, ctx: GraphqlContext) => {
    if(!ctx.user?.id){
      throw new Error("Unauthorized! Please login to create a story.");
    }

    let expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // stories expire after 24 hours

    await prismaClient.story.create({
      data: {
        mediaUrl,
        userId: ctx.user.id,
        expiresAt,
      }
    });
    return {
      success: true,
      message: "Story uploaded successfully"
    };
  },

  deleteStory: async(parent:any, {storyId}: {storyId: string}, ctx: GraphqlContext) => {
    if(!ctx?.user?.id) {
      throw new Error("User is not authenticated")
    }

    if(!storyId) {
      throw new Error("Story not found or already deleted")
    };

    const story = await prismaClient.story.findFirst({
      where: {
        id: storyId,
        userId: ctx.user.id
      }
    });
  
    if (!story) {
      throw new Error("Story not found or already deleted");
    }

    if(story.userId != ctx.user.id){
      throw new Error("You are not authorized to delete this story");
    }
  
    await prismaClient.story.delete({
      where: {
        id: storyId
      }
    })
    return {
      success: true,
      message: "Story deleted successfully"
    };
  }

};

export const resolvers = { mutations , queries };
