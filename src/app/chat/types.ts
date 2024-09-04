export const types = `#graphql
    type Chat {
        id: ID!
        users: [ChatUser]
        messages: [Message]
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
`;
