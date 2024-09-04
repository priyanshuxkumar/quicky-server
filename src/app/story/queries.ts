export const queries = `#graphql
    fetchUserStories(userId:String!) : [Story!]!
    fetchStoryOfChatUsers: [User!]!
    getSignedUrlOfStoryMedia(mediaName:String! , mediaType:String!):String
`;
