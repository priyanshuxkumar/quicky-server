export const mutations = `#graphql
    registerUser(payload: UserCreateInput!): User!  
    loginUser(payload: UserLoginInput!): AuthPayload!
    sendMessage(payload: SendMessageInput!): Message
    sendOTPVerificationEmail(email: String!): Response!
    verifyOTP(email: String! , otp:String!): Response!
    updateUserProfileDetails(payload: UpdateUserProfileDetailsInput): User!
    changePassword(oldPassword: String!, newPassword: String!, confirmPassword:String!): Response!
    updateMsgSeenStatus(chatId:String!):Response!
    createStory(mediaUrl:String): Response!
    deleteStory(storyId:String): Response!
`;

