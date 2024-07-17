export const queries = `#graphql
    getCurrentUser: User
    fetchAllMessages(chatId: ID , recipientId: ID , limit: Int , offset: Int): [Message!]!
    fetchAllChats: [Chat!]!
    getUserByUsername(username: String!): [User!]!
    checkUsernameIsValid(username: String!) : Boolean
    checkEmailIsValid(email: String!) : Boolean
    getSignedUrlOfChat(imageName: String! ,imageType: String!): String
    getSignedUrlOfAvatar(imageName: String!, imageType: String!): String
    fetchUserStories(userId:String!) : [Story!]!
    fetchStoryOfChatUsers: [User!]!
    getSignedUrlOfStoryMedia(mediaName:String! , mediaType:String!):String
    getSignedUrlOfSharedMedia(shareMediaName:String! , shareMediaType:String!):String
    fetchSharedMediaOfChat(chatId:String!): [Message!]! 
`;