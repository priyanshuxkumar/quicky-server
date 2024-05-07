import bcrypt from "bcryptjs"; // For hashing passwords
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import JWTService from "../../services/jwt";


export interface createUserPayload {
  firstname: string;
  lastname?: string;
  email: string;
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


const queries = {
    getCurrentUser: async(parent: any , args: any , ctx: GraphqlContext) => {
      const id = ctx.user?.id
      if(!id) return null
      
      const user = await prismaClient.user.findUnique({where: {id}})
      if(!user){
        throw new Error("User not found")
      }
      return user;
    }
}

const mutations = {
    registerUser: async (
      parent: any,
      { payload }: { payload: createUserPayload },
      ctx: GraphqlContext
    ) => {
      const { firstname, lastname, email, username, password } = payload;

      // Validate password length (min 8 characters)
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
    createChat: async(parent: any,{ payload }: { payload: createChatPayload },ctx: GraphqlContext) => {
        if (!ctx.user?.id) {
          throw new Error("Unauthorized! Please login to create a chat.");
        };
        
        const {recieverId} = payload

        if(!recieverId) {
          throw new Error("Failed to fetch Chat")
        }

        const existingChat = await prismaClient.chat.findFirst({
          where: {
              AND: [
                  { users: { some: { id: ctx.user.id } } },
                  { users: { some: { id: recieverId } } }
              ],
          },
          include: {
            users: true
          }
        });
  
        if (existingChat) {
            return existingChat;
        }

        // Create a new chat and connect the current user and recipient
        const newChat = await prismaClient.chat.create({
          data: {
              users: {
                  connect: [
                      { id: ctx.user.id },
                      { id: recieverId },
                  ],
              },
          },
          include: {
              users: true,
          },
        });

        return newChat;

    }
};

export const resolvers = { mutations , queries };
