// Copies the linked issue's milestone onto a PR that has none. A milestone
// already on the PR is left alone so a developer's manual choice sticks.
const linkedIssues = require('./linked-issues.js')

module.exports = async ({ github, context, core }) => {
  const pr = context.payload.pull_request
  if (pr.milestone) return core.info(`PR already in milestone "${pr.milestone.title}" — leaving it.`)

  const linked = await linkedIssues({ github, context, core })
  const milestones = new Map(linked.filter((i) => i.milestone).map((i) => [i.milestone.number, i.milestone.title]))
  if (milestones.size === 0) return core.info('No linked issue has a milestone — nothing to sync.')
  if (milestones.size > 1) {
    return core.warning(
      `Linked issues span milestones (${[...milestones.values()].join(', ')}) — set the PR milestone by hand.`
    )
  }

  const [[number, title]] = milestones
  try {
    await github.rest.issues.update({ ...context.repo, issue_number: pr.number, milestone: number })
    core.info(`Set milestone "${title}".`)
  } catch (error) {
    // Fork and Dependabot PRs get a read-only token on `pull_request`.
    if (error.status !== 403) throw error
    core.notice(`No write access from this PR — set milestone "${title}" by hand.`)
  }
}
