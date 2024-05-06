import bcrypt from "bcryptjs"; // For hashing passwords
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";

export interface createUserPayload {
  firstname: string;
  lastname?: string;
  email: string;
  password: string;
  username: string;
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
};

export const resolvers = { mutations };
