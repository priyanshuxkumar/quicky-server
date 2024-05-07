export const types = `#graphql
    input UserCreateInput {
        firstname: String!,
        lastname: String,
        email: String!, 
        avatar: String, 
        username: String! , 
        password: String!
    }

    input UserLoginInput {
        identifier: String!,
        password: String!
    }

    type User {
        id: ID!
        firstname: String!
        lastname: String
        username: String!
        email: String!
        avatar: String
        password: String!

    }

    type AuthPayload {
        user: User
        token: String!
    }
`;
