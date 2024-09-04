export const queries = `#graphql
    getCurrentUser: User
    getUserByUsername(username: String!): [User!]!
    checkUsernameIsValid(username: String!) : Boolean
    checkEmailIsValid(email: String!) : Boolean
    getSignedUrlOfAvatar(imageName: String!, imageType: String!): String    
`;
