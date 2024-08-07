export const queries = `#graphql
    fetchAllMessages(chatId: ID , recipientId: ID , limit: Int , offset: Int): [Message!]!
    fetchAllChats: [Chat!]!
    getSignedUrlOfChat(imageName: String! ,imageType: String!): String
    getSignedUrlOfSharedMedia(shareMediaName:String! , shareMediaType:String!):String
    fetchSharedMediaOfChat(chatId:String!): [Message!]! 
`;
