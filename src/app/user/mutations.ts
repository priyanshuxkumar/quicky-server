export const mutations = `#graphql
    registerUser(payload: UserCreateInput!): User!  
    loginUser(payload: UserLoginInput!): AuthPayload!
    createChat(payload: ChatCreateInput!): Chat!
    createMessage(payload: CreateMessageInput!): Message!
`;

