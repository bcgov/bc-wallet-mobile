// Returns the issues GitHub tracks as closed by the PR — a bare "#123" in
// prose creates no such link.
//
// GitHub resolves `Closes #123` into a tracked link a few seconds after the
// webhook fires, so an empty first result may just be the workflow outrunning
// it. Only an absent link waits, and only long enough to tell "not linked yet"
// apart from "not linked".
const RETRY_DELAY_MS = 7000
const RETRIES = 3

const query = async ({ github, context }) => {
  const { repository } = await github.graphql(
    `query($owner:String!, $repo:String!, $number:Int!) {
       repository(owner:$owner, name:$repo) {
         pullRequest(number:$number) {
           closingIssuesReferences(first: 100) {
             nodes { number milestone { number title } }
           }
         }
       }
     }`,
    { owner: context.repo.owner, repo: context.repo.repo, number: context.payload.pull_request.number }
  )
  return repository.pullRequest.closingIssuesReferences.nodes
}

const linkedIssues = async ({ github, context, core }) => {
  let linked = await query({ github, context })
  for (let attempt = 1; linked.length === 0 && attempt <= RETRIES; attempt++) {
    core.info(`No linked issue yet — retrying in ${RETRY_DELAY_MS / 1000}s (${attempt}/${RETRIES})`)
    // NOSONAR on the next two lines: retries must run one after another, with a wait between.
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS)) // NOSONAR
    linked = await query({ github, context }) // NOSONAR
  }
  return linked
}

module.exports = linkedIssues
