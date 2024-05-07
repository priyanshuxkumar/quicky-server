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
    }
};

export const resolvers = { mutations };
