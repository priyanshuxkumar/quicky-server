export const mutations = `#graphql
    updateUserProfileDetails(payload: UpdateUserProfileDetailsInput): User!
    changePassword(oldPassword: String!, newPassword: String!, confirmPassword:String!): Response!
`;

