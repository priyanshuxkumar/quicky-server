export const mutations = `#graphql
    sendMessage(payload: SendMessageInput!): Message
    updateMsgSeenStatus(chatId:String!):Response!
`;
