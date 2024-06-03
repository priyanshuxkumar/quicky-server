export const queries = `#graphql
    getCurrentUser: User
    fetchAllMessages(chatId: ID , recipientId: ID): [Message!]!
    fetchAllChats: [Chat!]!
    getUserByUsername(username: String!): [User!]!
    checkUsernameIsValid(username: String!) : Boolean
    checkEmailIsValid(email: String!) : Boolean
    getSignedUrlOfChat(imageName: String! ,imageType: String!): String
    getSignedUrlOfAvatar(imageName: String!, imageType: String!): String

`;
