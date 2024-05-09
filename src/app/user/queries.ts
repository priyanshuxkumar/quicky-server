export const queries = `#graphql
    getCurrentUser: User
    fetchAllMessages(chatId: ID!): [Message!]!
    fetchAllChats: [Chat!]!
`;
