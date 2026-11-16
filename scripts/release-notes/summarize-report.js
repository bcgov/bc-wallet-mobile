// Asks GitHub Models (the inference endpoint behind Copilot) for a
// plain-language version of the release notes report and posts it as a comment
// on the discussion the report was posted to.
//
// Requires BODY, OLDER_TAG, NEWER_TAG, DISCUSSION_ID, MODEL and MODELS_TOKEN
// in the environment, `models: read` and `discussions: write` on the job.
//
// Deliberately fails soft. The report itself is already posted by the time
// this runs, the summary is a draft someone edits before it reaches a store
// listing, and GitHub Models is a dependency outside this repo — none of that
// is worth failing a release on. The reason lands in the run summary.
const ENDPOINT = 'https://models.github.ai/inference/chat/completions'

const SYSTEM_PROMPT = `You write the public release notes for the BC Services Card app, a government
identity app published on the App Store and Google Play. You are given the
engineering report for one build — the tickets and pull requests that went into
it, titled as developers wrote them — and you rewrite it for the people who use
the app.`

const FORMAT_PROMPT = `Rewrite the report below in exactly this format:

### App Store or Play Store description:
"One paragraph, three to five sentences, at most 450 characters, saying what
this update brings. Plain language, no ticket numbers, wrapped in double
quotes."

### What's new
- One bullet per user-visible improvement or new capability. (#1234)

### Fixes: <theme>
- One bullet per user-visible fix. Use as many themed sections as the content
  needs, each named for what the person was doing — for example
  "Fixes: unlocking and logging in", "Fixes: verifying your identity",
  "Fixes: errors and stability", "Fixes: updating from version 3.x".

### Accessibility and polish
- Accessibility, layout, contrast and other visual fixes.

Rules:
- Use only what is in the report. Never invent an item and never invent a
  number.
- End every bullet with the number(s) it came from in parentheses: (#4795) or
  (#4795, #4396). Use the ticket number, and a PR number only for a row that
  has no ticket.
- Say what changed for someone using the app, not how it was built. Leave out
  anything they cannot perceive: refactors, tests, CI, dependency bumps,
  spikes, release chores.
- Merge tickets that describe one change into a single bullet.
- Canadian English. No jargon, no code identifiers, no file names, no priority
  or sprint labels.
- Skip a section that would be empty, and output the notes themselves with no
  preamble.`

module.exports = async ({ github, core }) => {
  const { BODY, OLDER_TAG, NEWER_TAG, DISCUSSION_ID, MODEL, MODELS_TOKEN } = process.env

  let summary
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MODELS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${FORMAT_PROMPT}\n\nThe report covers everything between \`${OLDER_TAG}\` and \`${NEWER_TAG}\`:\n\n${BODY}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      // 401/403 here is almost always GitHub Models not being enabled for the
      // org rather than a bad token — the same GITHUB_TOKEN posted the report.
      throw new Error(`GitHub Models returned HTTP ${response.status}: ${detail.slice(0, 500)}`)
    }

    const payload = await response.json()
    summary = payload.choices?.[0]?.message?.content?.trim()
    if (!summary) {
      throw new Error(`GitHub Models returned no content: ${JSON.stringify(payload).slice(0, 500)}`)
    }
  } catch (error) {
    core.warning(`No plain-language summary was posted: ${error.message}`)
    await core.summary.addRaw(`⚠️ No plain-language summary was posted: ${error.message}`).addEOL().write()
    return
  }

  const body = [
    '## Plain-language release notes',
    '',
    `Drafted by \`${MODEL}\` from the report above. Read it before it goes anywhere near a store listing — it can only be as accurate as the ticket titles it was given.`,
    '',
    '---',
    '',
    summary,
  ].join('\n')

  const { addDiscussionComment } = await github.graphql(
    `mutation($discussionId: ID!, $body: String!) {
       addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
         comment { url }
       }
     }`,
    { discussionId: DISCUSSION_ID, body }
  )

  const url = addDiscussionComment.comment.url
  core.info(`Posted plain-language summary: ${url}`)
  await core.summary.addRaw(`✍️ Posted a [plain-language summary](${url})`).addEOL().write()
}
