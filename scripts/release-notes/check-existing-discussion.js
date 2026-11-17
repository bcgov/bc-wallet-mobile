// Guards against posting a duplicate release notes discussion for the same
// tag range. Requires OLDER_TAG and NEWER_TAG in the environment.
const discussionTitle = require('./discussion-title.js')

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo
  const { OLDER_TAG, NEWER_TAG } = process.env
  const title = discussionTitle({ olderTag: OLDER_TAG, newerTag: NEWER_TAG })

  // GitHub's search is tokenized, not exact — "in:title" can surface
  // near matches (e.g. v1.2.3 vs v1.2.30), so confirm an exact title
  // match before treating it as a real collision.
  const { search } = await github.graphql(
    `query($searchQuery: String!) {
       search(query: $searchQuery, type: DISCUSSION, first: 10) {
         nodes {
           ... on Discussion { title url }
         }
       }
     }`,
    { searchQuery: `repo:${owner}/${repo} in:title "${title}"` }
  )

  const existing = search.nodes.find((d) => d.title === title)
  if (existing) {
    throw new Error(
      `A discussion titled "${title}" already exists: ${existing.url}. Delete it first if you want to regenerate its contents, otherwise this run is a duplicate.`
    )
  }
}
