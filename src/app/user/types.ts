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

    type User {
        id: ID!
        firstname: String!
        lastname: String
        username: String!
        email: String!
        avatar: String
        isActive: Boolean
        users:  [ChatUser]
        stories: [Story]
        chatId: String
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

    input SendMessageInput {
        chatId:      String
        content:     String
        recipientId: String!
        storyId:     String
        shareMediaUrl: String
    }

    type Message {
        id:          ID!
        content:     String
        senderId:    String!
        recipientId: String
        chatId:      String!
        chat:        Chat
        createdAt:   String!
        isSeen:      Boolean!
        storyId:     String
        story:       Story
        shareMediaUrl: String       
    }

    type ChatUser {
        id: ID!
        user: User
        chat: Chat
    }

    type Response {
        success: Boolean!
        message: String!
    }

    input UpdateUserProfileDetailsInput {
        firstname: String
        lastname: String
        username: String
        avatar: String
    }

    type Story {
        id: ID!  
        user: User
        mediaUrl: String!
        createdAt: String!
        updatedAt: String!
        expiresAt: String!
    }
`;
