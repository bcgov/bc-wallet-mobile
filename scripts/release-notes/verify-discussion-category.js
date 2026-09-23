// Confirms the "release-notes" discussion category exists before the rest of
// the workflow does any work, and hands back the ids `createDiscussion` needs.
module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo

  const { repository } = await github.graphql(
    `query($owner: String!, $repo: String!) {
       repository(owner: $owner, name: $repo) {
         id
         discussionCategories(first: 20) { nodes { id name slug } }
       }
     }`,
    { owner, repo }
  )

  const category = repository.discussionCategories.nodes.find((c) => c.slug === 'release-notes')
  if (!category) {
    throw new Error(
      `No discussion category with slug "release-notes" on ${owner}/${repo}. Create it (Settings → Discussions) or update the slug this workflow looks for.`
    )
  }

  core.setOutput('repository_id', repository.id)
  core.setOutput('category_id', category.id)
}
