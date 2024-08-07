import bcrypt from "bcryptjs"; // For hashing passwords
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import JWTService from "../../services/jwt";
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
  password: string;
}


const otpStorage: { [key: string]: string } = {};

const mutations = {
  registerUser: async (
    parent: any,
    { payload }: { payload: createUserPayload },
    ctx: GraphqlContext
  ) => {
    try {
      const { firstname, lastname, email, username, password, avatar } =
        payload;

      if (!firstname || !lastname || !email || !username || !password) {
        throw new Error("Missing required fields.");
      }

      const isEmailTaken = await prismaClient.user.findFirst({
        where: { email },
      });

      if (isEmailTaken) {
        return { errors: [{ message: "Email is already taken!" }] };
      }

      const isUsernameTaken = await prismaClient.user.findFirst({
        where: { username },
      });

      if (isUsernameTaken) {
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
    } catch (error: any) {
      console.log("Error in registerUser:", error.message);
      if (error.message == "Email is already taken!") {
        return { errors: [{ message: "Email is already taken!" }] };
      }
      if (error.message == "Username is already taken!") {
        return { errors: [{ message: "Username is already taken!" }] };
      }
      if (error.message == "Password must be at least 8 characters long.") {
        return {
          errors: [{ message: "Password must be at least 8 characters long." }],
        };
      }
      console.error("Error in registerUser:", error);
    }
  },

  sendOTPVerificationEmail: async (
    parent: any,
    { email }: { email: string },
    ctx: GraphqlContext
  ) => {
    try {
      const isEmailTaken = await prismaClient.user.findFirst({
        where: {
          email,
        },
      });
      if (isEmailTaken) {
        throw new Error("Account is already exists with this email!");
      }

      const OTP = Math.floor(100000 + Math.random() * 900000).toString();

      // Store the OTP temporarily
      otpStorage[email] = OTP;

      await sendOTPEmail(email, OTP);
      return {
        success: true,
        message: "OTP sent successfully!",
      };
    } catch (error: any) {
      console.error("Error in resendOTP:", error.message);
      throw new Error("Failed to resend OTP.");
    }
  },

  verifyOTP: async (
    parent: any,
    { otp, email }: { otp: string; email: string },
    ctx: GraphqlContext
  ) => {
    if (!otp || !email) {
      throw new Error("This field can't be empty!");
    }
    if (otpStorage[email] != otp) {
      throw new Error("Invalid OTP!");
    }
    return {
      success: true,
      message: "OTP verified successfully!",
    };
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

 

  
};

export const resolvers = { mutations};