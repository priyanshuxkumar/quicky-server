export const queries = `#graphql
    getCurrentUser: User
    fetchAllMessages(chatId: ID!): [Message!]!
    fetchAllChats: [Chat!]!
    getUserByUsername(username: String!): [User!]!
    checkUsernameIsValid(username: String!) : Boolean
    checkEmailIsValid(email: String!) : Boolean
`;
