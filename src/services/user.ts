// import { prismaClient } from "../clients/db"
// import bcrypt from "bcryptjs";


// export interface createUserPayload{
//     firstname: string
//     lastname?: string
//     email: string
//     password: string
//     username: string
//     avatar?: string
// }

// class UserService{
//     public static async createUser(payload: createUserPayload){
//         const {firstname, lastname , email , password , username} = payload;
//         const hashedPassword = await bcrypt.hash(password , 10) 

//         return prismaClient.user.create({
//             data: {
//                 firstname,
//                 lastname,
//                 email,
//                 username,
//                 password: hashedPassword
//             }
//         })

//     }
// }

// export default UserService;