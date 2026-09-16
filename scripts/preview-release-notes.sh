#!/usr/bin/env bash
# Local preview of .github/workflows/release-notes.yml's output.
#
# Mirrors the workflow step-for-step (tag resolution -> PR enumeration via
# git log -> batched GraphQL -> categorize -> render markdown) so what you
# see here should match what the real workflow posts. It does NOT create a
# Discussion unless you pass --create-discussion — by default it only prints
# the markdown and saves it to a file, which is the point: see the output
# before merging.
#
# Usage:
#   ./preview-release-notes.sh <tag_a> <tag_b> [--create-discussion]
#
# Token / scope:
#   Uses `gh auth token` by default. That's almost certainly enough for
#   everything except the Priority and Sprint columns, which need org
#   Projects read (`read:project`) — the same scope the workflow gets from
#   the 1Password PAT at op://bcsc-mobile-app-cd/github-projects/credential.
#   Your personal gh token probably lacks it. Two options:
#     - Run as-is: Priority/Sprint will show "(no read:project scope)" and
#       everything else (tickets, categories, PR links) previews correctly.
#     - For real Priority/Sprint values: `gh auth refresh -s read:project` once, or
#       export GH_TOKEN to a token that already has it (e.g.
#       `export GH_TOKEN=$(op read op://bcsc-mobile-app-cd/github-projects/credential)`
#       if you have 1Password CLI access), then rerun.
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <tag_a> <tag_b> [--create-discussion]" >&2
  exit 1
fi

TAG_A="$1"
TAG_B="$2"
CREATE_DISCUSSION="false"
if [ "${3:-}" = "--create-discussion" ]; then
  CREATE_DISCUSSION="true"
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "${REPO_ROOT}"

NAME_WITH_OWNER=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER="${NAME_WITH_OWNER%%/*}"
REPO="${NAME_WITH_OWNER##*/}"
echo "Repo: ${OWNER}/${REPO}" >&2

git fetch --tags -q

for t in "${TAG_A}" "${TAG_B}"; do
  if ! git rev-parse -q --verify "refs/tags/${t}" >/dev/null; then
    echo "::error:: Tag '${t}' does not exist locally (ran git fetch --tags — check spelling)." >&2
    exit 1
  fi
done

# Order by commit date, not ancestry — release/* branches can carry fixes
# independent of main, so two real tags aren't guaranteed to sit on one
# straight line. `git log older..newer` still means "what's new in newer
# since older" regardless, so divergence is just a heads-up, not a failure.
DATE_A=$(git log -1 --format=%ct "${TAG_A}")
DATE_B=$(git log -1 --format=%ct "${TAG_B}")
if [ "${DATE_A}" -le "${DATE_B}" ]; then
  OLDER="${TAG_A}"; NEWER="${TAG_B}"
else
  OLDER="${TAG_B}"; NEWER="${TAG_A}"
fi

if ! git merge-base --is-ancestor "${OLDER}" "${NEWER}"; then
  UNIQUE_TO_OLDER=$(git log --oneline "${NEWER}..${OLDER}" | wc -l | tr -d ' ')
  echo "⚠️  ${OLDER} and ${NEWER} are on divergent history — ${UNIQUE_TO_OLDER} commit(s) reachable from ${OLDER} never made it into ${NEWER}'s line and are excluded. This only covers what's new in ${NEWER} since ${OLDER}." >&2
fi
echo "Range: ${OLDER}..${NEWER}" >&2

PR_NUMBERS=$(git log --pretty=%s "${OLDER}..${NEWER}" \
  | grep -oE '\(#[0-9]+\)[[:space:]]*$' \
  | grep -oE '[0-9]+' \
  | sort -un) || true

if [ -z "${PR_NUMBERS}" ]; then
  echo "No PRs found between ${OLDER} and ${NEWER}." >&2
  PR_NUMBERS_JSON="[]"
else
  PR_NUMBERS_JSON=$(printf '%s\n' "${PR_NUMBERS}" | jq -R -s -c 'split("\n") | map(select(length > 0) | tonumber)')
fi
echo "$(echo "${PR_NUMBERS_JSON}" | jq 'length') PR(s) in range." >&2

GH_TOKEN_VALUE="${GH_TOKEN:-$(gh auth token)}"

OWNER="${OWNER}" REPO="${REPO}" OLDER_TAG="${OLDER}" NEWER_TAG="${NEWER}" \
PR_NUMBERS_JSON="${PR_NUMBERS_JSON}" GH_TOKEN_VALUE="${GH_TOKEN_VALUE}" \
CREATE_DISCUSSION="${CREATE_DISCUSSION}" \
node <<'NODE_EOF'
const owner = process.env.OWNER
const repo = process.env.REPO
const OLDER_TAG = process.env.OLDER_TAG
const NEWER_TAG = process.env.NEWER_TAG
const prNumbers = JSON.parse(process.env.PR_NUMBERS_JSON)
const token = process.env.GH_TOKEN_VALUE
const createDiscussionRequested = process.env.CREATE_DISCUSSION === 'true'
const here = `${owner}/${repo}`

const PROJECT_NUMBER = 108
const SPRINT_FIELD_NAME = 'Sprint'
const PRIORITY_FIELD_NAME = 'Priority'

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) {
    const err = new Error(json.errors.map((e) => e.message).join('; '))
    err.graphqlErrors = json.errors
    throw err
  }
  return json.data
}

const isInsufficientScope = (error) =>
  (error.graphqlErrors ?? []).some((e) => e.type === 'INSUFFICIENT_SCOPES')

const esc = (s) => (s ?? '').replace(/\|/g, '\\|')
const issueLink = (n) => `[#${n}](https://github.com/${here}/issues/${n})`
const prLink = (n) => `[#${n}](https://github.com/${here}/pull/${n})`

const prFragment = (alias, includeProject) => `
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
        ${includeProject ? `projectItems(first: 10) {
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
        }` : ''}
      }
    }
  }`

async function fetchChunk(chunk, includeProject) {
  const aliases = chunk.map((_, idx) => `pr${idx}`)
  const varDecls = aliases.map((a) => `$${a}: Int!`).join(', ')
  const fragments = aliases.map((a) => prFragment(a, includeProject)).join('\n')
  // $sprintField/$priorityField are only referenced inside the project
  // fragment — GraphQL rejects a declared-but-unused variable, so they must
  // drop out of the signature too when the fallback (no read:project scope)
  // query is used.
  const projectFieldDecls = includeProject ? '$sprintField: String!, $priorityField: String!, ' : ''
  const query = `query($owner: String!, $repo: String!, ${projectFieldDecls}${varDecls}) {
    repository(owner: $owner, name: $repo) { ${fragments} }
  }`
  const vars = {
    owner,
    repo,
    ...(includeProject ? { sprintField: SPRINT_FIELD_NAME, priorityField: PRIORITY_FIELD_NAME } : {}),
  }
  chunk.forEach((n, idx) => { vars[aliases[idx]] = n })
  const { repository } = await graphql(query, vars)
  return aliases.map((a) => repository[a]).filter(Boolean)
}

async function main() {
  const CHUNK = 40
  let projectScopeOK = true
  let warnedNoScope = false
  const allPRs = []

  for (let i = 0; i < prNumbers.length; i += CHUNK) {
    const chunk = prNumbers.slice(i, i + CHUNK)
    try {
      allPRs.push(...(await fetchChunk(chunk, projectScopeOK)))
    } catch (error) {
      if (projectScopeOK && isInsufficientScope(error)) {
        projectScopeOK = false
        if (!warnedNoScope) {
          console.error('\n⚠️  Token lacks read:project scope — Sprint values will show "(no read:project scope)".')
          console.error('    Run `gh auth refresh -s read:project` or set GH_TOKEN to a token that has it, then rerun.\n')
          warnedNoScope = true
        }
        allPRs.push(...(await fetchChunk(chunk, false)))
      } else {
        throw error
      }
    }
  }

  const noTicketPRs = []
  const ticketsByNumber = new Map()

  for (const pr of allPRs) {
    if (pr.labels.nodes.some((l) => l.name === 'status/skip-changelog')) continue
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

  const projectItemFor = (issue) =>
    (issue.projectItems?.nodes ?? []).find((n) => n.project.number === PROJECT_NUMBER)

  const sprintFor = (issue) => {
    if (!projectScopeOK) return '(no read:project scope)'
    const value = projectItemFor(issue)?.sprint
    return value?.name ?? value?.title ?? '—'
  }

  const priorityFor = (issue) => {
    if (!projectScopeOK) return '(no read:project scope)'
    return projectItemFor(issue)?.priority?.name ?? '—'
  }

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
        const prCell = [...prs].sort((a, b) => a - b).map(prLink).join(', ')
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

  const fs = await import('node:fs/promises')
  const outPath = 'release-notes-preview.md'
  await fs.writeFile(outPath, body)
  console.error(`\n${ticketsByNumber.size} ticket(s), ${noTicketPRs.length} PR(s) with no linked ticket.`)
  console.error(`Saved to ${outPath}\n`)
  console.log(body)

  if (createDiscussionRequested) {
    console.error('\n--create-discussion passed — creating the Discussion for real...')
    const { repository } = await graphql(
      `query($owner: String!, $repo: String!) {
         repository(owner: $owner, name: $repo) {
           id
           discussionCategories(first: 20) { nodes { id name slug } }
         }
       }`,
      { owner, repo }
    )
    const category = repository.discussionCategories.nodes.find((c) => c.slug === 'release-notes')
    if (!category) throw new Error(`No discussion category with slug "release-notes" on ${here}.`)
    const title = `${NEWER_TAG} release notes`
    const { createDiscussion } = await graphql(
      `mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
         createDiscussion(input: { repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body }) {
           discussion { url }
         }
       }`,
      { repositoryId: repository.id, categoryId: category.id, title, body }
    )
    console.error(`Created: ${createDiscussion.discussion.url}`)
  } else {
    console.error('Dry run only — no Discussion was created. Rerun with --create-discussion to actually post it.')
  }
}

main().catch((err) => {
  console.error(err.stack ?? err.message)
  process.exit(1)
})
NODE_EOF
