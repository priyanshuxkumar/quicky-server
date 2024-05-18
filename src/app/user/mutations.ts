export const mutations = `#graphql
    registerUser(payload: UserCreateInput!): User!  
    loginUser(payload: UserLoginInput!): AuthPayload!
    sendMessage(payload: SendMessageInput!): Message
    sendOTPVerificationEmail(email: String!): verificationEmailResponse!
    verifyOTP(email: String! , otp:String!): verificationEmailResponse!
`;

