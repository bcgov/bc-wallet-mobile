// Posts the built report as a new Discussion. Requires OLDER_TAG, NEWER_TAG,
// BODY, REPOSITORY_ID and CATEGORY_ID in the environment. Reports the new
// discussion's id, which the summary step comments on.
const discussionTitle = require('./discussion-title.js')

module.exports = async ({ github, core }) => {
  const { OLDER_TAG, NEWER_TAG, BODY, REPOSITORY_ID, CATEGORY_ID } = process.env
  const title = discussionTitle({ olderTag: OLDER_TAG, newerTag: NEWER_TAG })

  const { createDiscussion } = await github.graphql(
    `mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
       createDiscussion(input: {
         repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body
       }) {
         discussion { id url }
       }
     }`,
    { repositoryId: REPOSITORY_ID, categoryId: CATEGORY_ID, title, body: BODY }
  )

  const { id, url } = createDiscussion.discussion
  core.setOutput('discussion_id', id)
  core.setOutput('discussion_url', url)
  core.info(`Created discussion: ${url}`)
  await core.summary.addRaw(`📝 Created [release notes discussion](${url})`).write()
}
