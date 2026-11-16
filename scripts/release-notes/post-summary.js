// Posts the plain-language summary the Copilot CLI drafted as a comment on the
// release notes discussion. Requires SUMMARY_FILE, DISCUSSION_ID and MODEL in
// the environment, and `discussions: write` on the job.
//
// Deliberately fails soft, start to finish. The report itself is already
// posted by the time this runs, the summary is a draft someone edits before it
// reaches a store listing, and the CLI and its service are dependencies
// outside this repo — none of that is worth failing a release on. Whatever
// went wrong, and the draft itself if there is one, lands in the run summary.
const fs = require('node:fs')

module.exports = async ({ github, core }) => {
  const { SUMMARY_FILE, DISCUSSION_ID, MODEL } = process.env

  let summary = ''
  try {
    summary = fs.readFileSync(SUMMARY_FILE, 'utf8').trim()
  } catch {
    // The drafting step runs with continue-on-error, so getting here means it
    // failed and said why in its own log.
  }

  if (!summary) {
    core.warning(
      'No plain-language summary was posted: the Copilot CLI produced no draft. See the drafting step for why.'
    )
    await core.summary
      .addRaw('⚠️ No plain-language summary was posted: the Copilot CLI produced no draft.')
      .addEOL()
      .write()
    return
  }

  const body = [
    '## Plain-language release notes',
    '',
    `Drafted by Copilot (\`${MODEL}\`) from the report above. Read it before it goes anywhere near a store listing — it can only be as accurate as the ticket titles it was given.`,
    '',
    '---',
    '',
    summary,
  ].join('\n')

  let url
  try {
    const { addDiscussionComment } = await github.graphql(
      `mutation($discussionId: ID!, $body: String!) {
         addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
           comment { url }
         }
       }`,
      { discussionId: DISCUSSION_ID, body }
    )
    url = addDiscussionComment.comment.url
  } catch (error) {
    // The draft goes to the run summary so the one thing that cost Copilot
    // credits is still there to copy.
    core.warning(`The plain-language summary was drafted but could not be posted: ${error.message}`)
    await core.summary
      .addRaw(`⚠️ The plain-language summary could not be posted: ${error.message}`)
      .addEOL()
      .addRaw('<details><summary>The draft itself</summary>')
      .addEOL()
      .addCodeBlock(summary, 'markdown')
      .addRaw('</details>')
      .addEOL()
      .write()
    return
  }

  core.info(`Posted plain-language summary: ${url}`)
  await core.summary.addRaw(`✍️ Posted a [plain-language summary](${url})`).addEOL().write()
}
