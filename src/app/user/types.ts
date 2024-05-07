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

    input ChatCreateInput{
        recieverId: String!
    }

    type User {
        id: ID!
        firstname: String!
        lastname: String
        username: String!
        email: String!
        avatar: String

    }

    type Chat {
        id: ID!
        users: [User]
        messages: [Message]
    }

    type AuthPayload {
        user: User
        token: String!
    }

    type Message {
        id: ID!
        content:     String
        senderId:    String
        recipientId: String
        chatId:      String
    }
`;
