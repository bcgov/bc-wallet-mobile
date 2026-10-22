// Posts the built report as a new Discussion. Requires NEWER_TAG, BODY,
// REPOSITORY_ID and CATEGORY_ID in the environment.
module.exports = async ({ github, core }) => {
  const { NEWER_TAG, BODY, REPOSITORY_ID, CATEGORY_ID } = process.env
  const title = `${NEWER_TAG} release notes`

  const { createDiscussion } = await github.graphql(
    `mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
       createDiscussion(input: {
         repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body
       }) {
         discussion { url }
       }
     }`,
    { repositoryId: REPOSITORY_ID, categoryId: CATEGORY_ID, title, body: BODY }
  )

  const url = createDiscussion.discussion.url
  core.info(`Created discussion: ${url}`)
  await core.summary.addRaw(`📝 Created [release notes discussion](${url})`).write()
}
