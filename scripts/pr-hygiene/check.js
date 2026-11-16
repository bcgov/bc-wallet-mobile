// Fails a PR that asks for review without a linked issue or with its template
// sections left empty.
const linkedIssues = require('./linked-issues.js')

const SECTIONS = ['What changed', 'What should the reviewer focus on', 'How to test']
const MIN = 15

const checkPrHygiene = async ({ github, context, core }) => {
  const pr = context.payload.pull_request

  const pass = async (reason) => {
    core.info(`PASS — ${reason}`)
    await core.summary.addRaw(`✅ **PR hygiene passed** — ${reason}`).write()
  }
  const fail = async (problems) => {
    const list = problems.map((p) => `- ${p}`).join('\n')
    await core.summary
      .addRaw(`❌ **PR hygiene**\n\n${list}\n\n<sub>No issue to link? Add the \`status/no-issue\` label.</sub>`)
      .write()
    core.setFailed(problems.join(' | '))
  }

  // merge_group carries no PR payload; the check already ran on the PR itself.
  if (!pr) return pass('merge group')
  if (pr.draft) return pass('draft — not asking for review yet')

  const login = pr.user?.login ?? ''
  if (pr.user?.type === 'Bot' || login.endsWith('[bot]')) return pass(`bot author (${login})`)

  const labels = new Set(pr.labels.map((l) => l.name))
  for (const skip of ['dependencies', 'status/no-issue']) {
    if (labels.has(skip)) return pass(`\`${skip}\` label`)
  }

  // Prefixes for work that structurally cannot have an issue. `chore:` is
  // deliberately NOT here — it exempted ~19% of merged PRs on a self-declared
  // title nobody verifies, so chores use the `status/no-issue` label instead.
  if (/^(build|docs|release)(\([^)]*\))?!?:/i.test(pr.title)) {
    return pass('title prefix exempts it')
  }

  const problems = []

  const linked = await linkedIssues({ github, context, core })
  if (linked.length === 0) {
    problems.push(
      'No linked issue. Put `Closes #1234` on the first line, or link one in the Development sidebar. ' +
        'A bare `#1234` in the body does not create a link GitHub tracks.'
    )
  }

  // Guidance lives in HTML comments, so strip them before measuring. Repeat until
  // stable so nested fragments can't reassemble a comment; an unclosed `<!--`
  // hides the rest of the body on GitHub, so it counts as empty here too.
  let body = pr.body ?? ''
  for (let previous; previous !== body; ) {
    previous = body
    body = body.replace(/<!--[\s\S]*?(?:-->|$)/g, '')
  }

  for (const heading of SECTIONS) {
    const re = new RegExp(String.raw`^#{1,6}\s*${heading}\s*$([\s\S]*?)(?=^#{1,6}\s|$(?![\s\S]))`, 'im')
    const match = body.match(re)
    if (!match) {
      problems.push(`Missing section: **${heading}**`)
    } else if (match[1].trim().length < MIN) {
      problems.push(`**${heading}** is empty or too short (needs ${MIN}+ characters)`)
    }
  }

  if (problems.length) return fail(problems)
  await pass(`linked to #${linked.map((n) => n.number).join(', #')}, all sections filled in`)
}

module.exports = checkPrHygiene
