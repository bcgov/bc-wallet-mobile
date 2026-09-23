// Builds the Markdown body of the release notes report: looks up each PR's
// linked issue, buckets it by category, and renders grouped tables.
// Requires OLDER_TAG, NEWER_TAG and PR_NUMBERS (a JSON array of PR numbers)
// in the environment, and a github client authenticated with the project
// board's PAT (for Sprint/Priority)
module.exports = async ({ github, context, core }) => {
  const { OLDER_TAG, NEWER_TAG, PR_NUMBERS } = process.env
  const prNumbers = JSON.parse(PR_NUMBERS)
  const { owner, repo } = context.repo
  const here = `${owner}/${repo}`

  // Project 108 = "BC Wallet" board. Sprint/Priority are looked up
  // by field name, so a rename fails loudly instead of going blank.
  const PROJECT_NUMBER = 108
  const SPRINT_FIELD_NAME = 'Sprint'
  const PRIORITY_FIELD_NAME = 'Priority'

  const esc = (s) => (s ?? '').replace(/\|/g, '\\|')
  const issueLink = (n) => `[#${n}](https://github.com/${here}/issues/${n})`
  const prLink = (n) => `[#${n}](https://github.com/${here}/pull/${n})`

  const prFragment = (alias) => `
    ${alias}: pullRequest(number: $${alias}) {
      number
      title
      labels(first: 20) { nodes { name } }
      closingIssuesReferences(first: 10) {
        nodes {
          number
          title
          repository { nameWithOwner }
          issueType { name }
          labels(first: 20) { nodes { name } }
          projectItems(first: 10) {
            nodes {
              project { number }
              sprint: fieldValueByName(name: $sprintField) {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
                ... on ProjectV2ItemFieldIterationValue { title }
              }
              priority: fieldValueByName(name: $priorityField) {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
            }
          }
        }
      }
    }`

  const CHUNK = 40
  const allPRs = []
  for (let i = 0; i < prNumbers.length; i += CHUNK) {
    const chunk = prNumbers.slice(i, i + CHUNK)
    const aliases = chunk.map((_, idx) => `pr${idx}`)
    const varDecls = aliases.map((a) => `$${a}: Int!`).join(', ')
    const fragments = aliases.map(prFragment).join('\n')
    const query = `query($owner: String!, $repo: String!, $sprintField: String!, $priorityField: String!, ${varDecls}) {
      repository(owner: $owner, name: $repo) { ${fragments} }
    }`
    const vars = { owner, repo, sprintField: SPRINT_FIELD_NAME, priorityField: PRIORITY_FIELD_NAME }
    chunk.forEach((n, idx) => {
      vars[aliases[idx]] = n
    })

    let repository
    try {
      ;({ repository } = await github.graphql(query, vars))
    } catch (error) {
      const status = error.status ?? 0
      const types = (error.errors ?? []).map((e) => e.type)
      if (status === 401 || /bad credentials|requires authentication/i.test(error.message ?? '')) {
        throw new Error(
          'Project token rejected (401) — the fine-grained PAT at op://bcsc-mobile-app-cd/github-projects/credential has almost certainly expired (bcgov caps fine-grained PATs at 90 days). Mint a replacement; no GitHub secret needs changing.'
        )
      }
      if (types.includes('INSUFFICIENT_SCOPES')) {
        throw new Error('Project token lacks required scope.')
      }
      throw error
    }
    for (const alias of aliases) {
      const pr = repository[alias]
      if (!pr) {
        core.warning(`A PR in this range no longer resolves via the API — skipping it.`)
        continue
      }
      allPRs.push(pr)
    }
  }

  const noTicketPRs = []
  const ticketsByNumber = new Map()

  for (const pr of allPRs) {
    const skipChangelog = pr.labels.nodes.some((l) => l.name === 'status/skip-changelog')
    if (skipChangelog) continue

    const sameRepoIssues = pr.closingIssuesReferences.nodes.filter((i) => i.repository.nameWithOwner === here)

    if (sameRepoIssues.length === 0) {
      noTicketPRs.push(pr)
      continue
    }

    for (const issue of sameRepoIssues) {
      let entry = ticketsByNumber.get(issue.number)
      if (!entry) {
        entry = { issue, prNumbers: new Set() }
        ticketsByNumber.set(issue.number, entry)
      }
      entry.prNumbers.add(pr.number)
    }
  }

  const projectItemFor = (issue) => issue.projectItems.nodes.find((n) => n.project.number === PROJECT_NUMBER)

  const sprintFor = (issue) => {
    const value = projectItemFor(issue)?.sprint
    return value?.name ?? value?.title ?? '—'
  }

  const priorityFor = (issue) => projectItemFor(issue)?.priority?.name ?? '—'

  const categoryFor = (issue) => {
    const labelNames = issue.labels.nodes.map((l) => l.name)
    if (labelNames.includes('work/tech-debt')) return 'Tech Debt'
    if (labelNames.includes('work/spike')) return 'Spike'
    const type = issue.issueType?.name
    if (type === 'Bug') return 'Bug'
    if (type === 'Feature') return 'Feature'
    if (type === 'Task') return 'Task'
    return 'Other'
  }

  const renderTicketTable = (rows) => {
    const header = '| Ticket | Priority | Title | Sprint | PR(s) |\n|---|---|---|---|---|'
    const body = rows
      .map(({ issue, prNumbers: prs }) => {
        const prCell = [...prs]
          .sort((a, b) => a - b)
          .map(prLink)
          .join(', ')
        return `| ${issueLink(issue.number)} | ${priorityFor(issue)} | ${esc(issue.title)} | ${sprintFor(issue)} | ${prCell} |`
      })
      .join('\n')
    return `${header}\n${body}`
  }

  const renderNoTicketTable = (prs) => {
    const header = '| PR | Title |\n|---|---|'
    const body = prs.map((pr) => `| ${prLink(pr.number)} | ${esc(pr.title)} |`).join('\n')
    return `${header}\n${body}`
  }

  const CATEGORY_ORDER = ['Bug', 'Feature', 'Task', 'Tech Debt', 'Spike', 'Other']
  let body = `Range: \`${OLDER_TAG}..${NEWER_TAG}\`\n\n`
  for (const cat of CATEGORY_ORDER) {
    const rows = [...ticketsByNumber.values()].filter((e) => categoryFor(e.issue) === cat)
    if (rows.length === 0) continue
    body += `## ${cat}\n\n${renderTicketTable(rows)}\n\n`
  }
  body += '## No linked ticket\n\n'
  body += noTicketPRs.length ? renderNoTicketTable(noTicketPRs) : '_None._\n'

  core.setOutput('body', body)
  core.info(`${ticketsByNumber.size} ticket(s), ${noTicketPRs.length} PR(s) with no linked ticket`)
}
