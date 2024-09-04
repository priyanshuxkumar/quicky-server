export const mutations = `#graphql
    registerUser(payload: UserCreateInput!): Response!
    loginUser(payload: UserLoginInput!): AuthPayload!
    sendOTPVerificationEmail(email: String!): Response!
    verifyOTP(email: String! , otp:String!): Response!
    
`;

