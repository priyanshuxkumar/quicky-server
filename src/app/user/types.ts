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

        chats: [Chat]
    }

    type Chat {
        id: ID!
        users: [User]
    }

    type AuthPayload {
        user: User
        token: String!
    }

    input CreateMessageInput {
        chatId:      String!
        recipientId: String!
        content:     String!
    }

    type Message {
        id: ID!
        recipientId: String!
        chatId:      String!
        content:     String!
        senderId:    String!
    }
`;
