export const types = `#graphql
    input UserCreateInput {
        firstname: String!,
        lastname: String,
        email: String!, 
        avatar: String, 
        username: String! , 
        password: String!,
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

        users: [ChatUser]
    }

    type Chat {
        id: ID!
        users: [ChatUser]
        messages: [Message]
    }

    type AuthPayload {
        user:  User
        token: String!
    }

    input CreateMessageInput {
        chatId:      String!
        content:     String!
        recipientId:  String
    }

    type Message {
        id:          ID!
        content:     String!
        senderId:    String!
        recipientId: String
        chatId:      String!
        chat:        Chat
    }

    type ChatUser {
        id: ID!
        user: User
        chat: Chat
    }
`;
