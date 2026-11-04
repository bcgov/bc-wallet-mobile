/**
 * The send-video review-queue logic in login.mjs, against a fake IDCheck portal whose pages are shaped
 * like the reference capture (idsit.gov.bc.ca, 2026-11-03): a dashboard with one claim form per queue
 * that holds work, a review page per claimed request, the transfer-note page and the confirmation
 * pages. No sign-in and no network — the functions under test take the fetch they use.
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { claimMatchingSendVideoRequest, drainReviewQueues } from './login.mjs'

const BASE = 'https://idsit.gov.bc.ca/idcheck/protected/backCheckRequest'
const CSRF = 'csrf-for-tests'

/** The journeys' personas, as approval.ts hands them over — made up here, like every request below. */
const PERSONAS = [
  { persona: 'photo', cardSerialNumber: 'C00000001', surname: 'TESTER', firstName: 'PAT' },
  { persona: 'na', cardSerialNumber: 'N/A', surname: 'TESTER', firstName: 'SAM' },
]
const photo = (id) => ({ id, serial: 'C00000001', surname: 'TESTER', firstName: 'PAT' })
/** The same persona's upload from the other platform — e2e work, never two lanes at once. */
const photoOnAndroid = (id) => ({ ...photo(id), os: 'Android' })
const cardless = (id) => ({ id, serial: 'N/A', surname: 'TESTER', firstName: 'SAM' })
/** Someone else's request — a UAT tester's, say. */
const stranger = (id) => ({ id, serial: 'C99999999', surname: 'VISITOR', firstName: 'ALEX' })

function html(title, body, pageData = '') {
  return (
    `<!doctype html><html><head><title>ID Check</title></head><body>` +
    `<div id="pageData" style="display:none;" data-base-url="/idcheck"${pageData}></div>` +
    `<h1 id="page-title">${title}</h1>${body}</body></html>`
  )
}

/** The dashboard: the specialist section renders ABOVE "Other Verify Requests", as on the portal. */
function dashboardPage(queues) {
  const specialist =
    queues.specialist.length > 0
      ? `<form name="open-next-request-for-review-form" id="open-next-request-for-review-form" action="/idcheck/protected/backCheckRequest/reviewIdentity" method="POST">` +
        `<input type="hidden" name="csrftoken" value="${CSRF}" /><button id="btnOpenNextRequestForSpecialist">Open Next Request for Specialist</button></form>`
      : '<p>No requests to review.</p>'
  const regular =
    queues.regular.length > 0
      ? `<form name="open-next-request-form" id="open-next-request-form" method="POST" action="/idcheck/protected/backCheckRequest/verifyIdentity">` +
        `<input type="hidden" name="csrftoken" value="${CSRF}" /><button id="btnOpenNextRequest">Open Next Request</button></form>`
      : '<p id="no-pending-verification-request">No requests to review.</p>'
  return html(
    'Verify Requests for Mobile Card',
    `<div id="specialist-review-requests-section">${specialist}</div><hr>` +
      `<p id="other-verify-requests"><b>Other Verify Requests</b></p>${regular}`
  )
}

function reviewPage(request) {
  return html(
    'Verify Identity to Set Up Mobile Card',
    `<div id="name-on-card"><span>${request.surname}</span>, <span>${request.firstName}</span> <span></span></div>
     <div id="card-serial-number">${request.serial}</div>
     <div id="device-os"><span><span>${request.os ?? 'iOS'}</span><span><span> 18.6</span></span></span></div>
     <div id="device-app-version"><span><span>4.2.0</span><span><span>(9300)</span></span></span></div>
     <div id="video-date"><h3>Video date: <span>November 3, 2026</span></h3></div>
     <form id="verify-form" method="POST" action="/protected/backCheckRequest/continue">
       <input type="hidden" name="remoteTxSessionName" value="${request.id}" />
       <input type="hidden" name="requestIdentifier" value="${request.id}" />
       <input type="checkbox" id="alert-reviewed" />
       <input type="radio" name="videoVerificationValue" value="0" /><input type="radio" name="videoVerificationValue" value="1" />
       <input type="radio" name="nameVerificationValue" value="0" /><input type="radio" name="nameVerificationValue" value="1" />
       <input type="radio" name="photoVerificationValue" value="0" /><input type="radio" name="photoVerificationValue" value="1" />
       <input type="hidden" name="csrftoken" value="${CSRF}" />
       <input type="radio" name="suspiciousActivityVerificationValue" value="0" /><input type="radio" name="suspiciousActivityVerificationValue" value="2" />
       <button name="command" type="submit" value="Continue">Continue</button>
       <button name="command" type="submit" value="CloseRequest">Close Request</button>
       <button name="command" type="submit" value="TransferToSpecialist">Transfer Request to Specialist</button>
     </form>`,
    ` data-csrf-token="${CSRF}" data-request-identifier="${request.id}"`
  )
}

function transferNotePage(request) {
  return html(
    'Add Notes for Transfer',
    `<form id="transfer-form" method="POST" data-action-path="transfer">
       <input type="hidden" name="csrftoken" value="${CSRF}" />
       <input type="hidden" name="identifier" value="${request.id}" />
       <input type="hidden" name="remoteTxSessionName" value="${request.id}" />
       <input type="hidden" name="transferToStatus" value="REVIEW" />
       <input type="hidden" name="cancelLinkPath" value="verifyIdentity/${request.id}" />
       <input type="hidden" name="cancelLinkText" value="Cancel, return to Verify Identity" />
       <textarea name="comment" id="comment"></textarea>
       <button id="submit-button" type="submit">Transfer Request</button>
     </form>`
  )
}

/**
 * A portal with the two FIFO queues and one agent session. `CloseRequest` puts the request back at the
 * HEAD of its queue (the capture showed it coming straight back); a transfer appends it to the
 * specialist queue — or, with `transferSticks: false`, back to the regular one. With
 * `releaseAccepted: false` the portal answers `CloseRequest` with a 500 and keeps the claim.
 */
function fakePortal({ regular = [], specialist = [], transferSticks = true, releaseAccepted = true } = {}) {
  const queues = { regular: [...regular], specialist: [...specialist] }
  /** The request this session holds a claim on, and the queue it came from. */
  let held = null
  const calls = []

  const page = (body, url) => ({
    ok: true,
    status: 200,
    url,
    headers: new Headers({ 'content-type': 'text/html;charset=UTF-8' }),
    text: async () => body,
  })

  async function fetchWithCookies(url, init = {}) {
    const method = init.method ?? 'GET'
    const body = new URLSearchParams(init.body ?? '')
    const path = new URL(url).pathname.slice(new URL(BASE).pathname.length + 1)
    calls.push({ method, path, body })
    switch (`${method} ${path}`) {
      case 'GET dashboard':
        return page(dashboardPage(queues), url)
      case 'POST verifyIdentity':
      case 'POST reviewIdentity': {
        assert.equal(held, null, `claimed from ${path} while still holding ${held?.request.id}`)
        const queue = path === 'verifyIdentity' ? 'regular' : 'specialist'
        const request = queues[queue].shift()
        if (!request) return page(dashboardPage(queues), `${BASE}/dashboard`) // the 302 to the dashboard, followed
        held = { request, queue }
        return page(reviewPage(request), `${BASE}/${path}/${request.id}`)
      }
      case 'POST continue': {
        assert.ok(held, 'continue without a claim')
        assert.equal(body.get('requestIdentifier'), held.request.id)
        assert.equal(body.get('csrftoken'), CSRF)
        switch (body.get('command')) {
          case 'CloseRequest':
            if (!releaseAccepted) return { ...page(html('Error', ''), url), ok: false, status: 500 }
            queues[held.queue].unshift(held.request)
            held = null
            return page(dashboardPage(queues), url)
          case 'TransferToSpecialist':
            return page(transferNotePage(held.request), url)
          case 'Continue':
            return page(html('Add Note to Activity Log', ''), url)
          default:
            throw new Error(`unexpected command ${body.get('command')}`)
        }
      }
      case 'POST transfer': {
        assert.ok(held, 'transfer without a claim')
        assert.equal(body.get('identifier'), held.request.id)
        assert.equal(body.get('transferToStatus'), 'REVIEW')
        queues[transferSticks ? 'specialist' : 'regular'].push(held.request)
        held = null
        return page(html('Request Transferred', ''), url)
      }
      case 'POST note': {
        assert.ok(held, 'note without a claim')
        assert.equal(body.get('identifier'), held.request.id)
        held = null // decided: gone from every queue
        return page(html('Note Added to Activity Log', ''), url)
      }
      default:
        throw new Error(`unexpected ${method} ${url}`)
    }
  }

  return {
    fetchWithCookies,
    queues,
    calls,
    get held() {
      return held
    },
    postsTo: (path) => calls.filter((call) => call.method === 'POST' && call.path === path),
    commands: () => calls.filter((call) => call.path === 'continue').map((call) => call.body.get('command')),
  }
}

const drainOptions = (overrides = {}) => ({
  scope: 'e2e',
  personas: PERSONAS,
  reason: 'Automated e2e queue cleanup',
  transferComment: 'moved by the test',
  maxClaims: 25,
  dryRun: false,
  ...overrides,
})

const ids = (summaries) => summaries.map((summary) => summary.requestIdentifier)

beforeEach(() => {
  mock.method(console, 'log', () => {})
})
afterEach(() => {
  mock.restoreAll()
})

test('scope e2e: rejects the e2e personas, moves a stranger out of the regular queue, leaves one at the specialist head', async () => {
  const portal = fakePortal({ regular: [stranger('R1'), photo('R2')], specialist: [stranger('S1'), cardless('S2')] })

  const result = await drainReviewQueues(portal.fetchWithCookies, drainOptions())

  assert.deepEqual(ids(result.transferred), ['R1'])
  assert.deepEqual(ids(result.rejected), ['R2'])
  assert.equal(result.rejected[0].persona, 'photo')
  assert.deepEqual(ids(result.released), ['S1'])
  assert.deepEqual(result.queuesWithWork, ['specialist'])
  assert.match(result.stoppedReason, /heads the specialist queue/)
  assert.deepEqual(portal.queues, { regular: [], specialist: [stranger('S1'), cardless('S2'), stranger('R1')] })
  assert.equal(portal.held, null)

  // The move is the portal's own transfer: the command without attestation answers, then the note.
  const [transferCommand] = portal
    .postsTo('continue')
    .filter((call) => call.body.get('command') === 'TransferToSpecialist')
  assert.equal(transferCommand.body.has('videoVerificationValue'), false)
  assert.equal(transferCommand.body.has('suspiciousActivityVerificationValue'), false)
  const [transfer] = portal.postsTo('transfer')
  assert.equal(transfer.body.get('comment'), 'moved by the test')
  assert.equal(transfer.body.get('cancelLinkText'), 'Cancel, return to Verify Identity')
  // The rejection is a decision — attested not-confident — with the cleanup reason on its note.
  const [decision] = portal.postsTo('continue').filter((call) => call.body.get('command') === 'Continue')
  assert.equal(decision.body.get('suspiciousActivityVerificationValue'), '2')
  assert.equal(portal.postsTo('note')[0].body.get('verificationComment'), 'Automated e2e queue cleanup')
  // The release attests nothing either.
  const [release] = portal.postsTo('continue').filter((call) => call.body.get('command') === 'CloseRequest')
  assert.equal(release.body.has('videoVerificationValue'), false)
})

test('a request it moved is expected back at the specialist head, not a reason to stop', async () => {
  const portal = fakePortal({ regular: [stranger('R1')] })

  const result = await drainReviewQueues(portal.fetchWithCookies, drainOptions())

  assert.deepEqual(ids(result.transferred), ['R1'])
  assert.deepEqual(ids(result.released), ['R1'])
  assert.deepEqual(result.rejected, [])
  assert.match(result.stoppedReason, /heads the specialist queue/)
  assert.doesNotMatch(result.stoppedReason, /came back/)
  assert.deepEqual(portal.queues, { regular: [], specialist: [stranger('R1')] })
})

test('a move that does not stick stops the drain, with the request released', async () => {
  const portal = fakePortal({ regular: [stranger('R1')], transferSticks: false })

  const result = await drainReviewQueues(portal.fetchWithCookies, drainOptions())

  assert.deepEqual(ids(result.transferred), ['R1'])
  assert.deepEqual(result.rejected, [])
  assert.match(result.stoppedReason, /R1 \(foreign\) came back to the regular queue after being transferred/)
  assert.deepEqual(result.queuesWithWork, ['regular'])
  assert.equal(portal.held, null)
  assert.deepEqual(portal.queues.regular, [stranger('R1')])
})

test('a release the portal does not accept fails the drain instead of being recorded', async (t) => {
  t.mock.method(console, 'warn', () => {})
  const portal = fakePortal({ specialist: [stranger('S1')], releaseAccepted: false })

  await assert.rejects(
    drainReviewQueues(portal.fetchWithCookies, drainOptions()),
    /did not accept the release of S1 .* specialist queue blocked/
  )

  assert.deepEqual(portal.commands(), ['CloseRequest'])
  assert.equal(portal.held.request.id, 'S1') // still ours — the drain said so instead of moving on
})

test('scope all rejects everything queued, regular queue first, and moves nothing', async () => {
  const portal = fakePortal({ regular: [stranger('R1'), photo('R2')], specialist: [stranger('S1')] })

  const result = await drainReviewQueues(portal.fetchWithCookies, drainOptions({ scope: 'all' }))

  assert.deepEqual(ids(result.rejected), ['R1', 'R2', 'S1'])
  assert.deepEqual(result.transferred, [])
  assert.deepEqual(result.released, [])
  assert.equal(result.stoppedReason, undefined)
  assert.deepEqual(result.queuesWithWork, [])
  assert.deepEqual(portal.postsTo('transfer'), [])
  assert.deepEqual(portal.queues, { regular: [], specialist: [] })
})

test('the claim cap leaves the rest queued and says so', async () => {
  const portal = fakePortal({ regular: [photo('R1'), photo('R2'), photo('R3')] })

  const result = await drainReviewQueues(portal.fetchWithCookies, drainOptions({ maxClaims: 2 }))

  assert.deepEqual(ids(result.rejected), ['R1', 'R2'])
  assert.match(result.stoppedReason, /stopped after 2 claims with the regular queue still holding work/)
  assert.deepEqual(result.queuesWithWork, ['regular'])
  assert.deepEqual(portal.queues.regular, [photo('R3')])
})

test('a dry run reads the dashboard and claims nothing', async () => {
  const portal = fakePortal({ specialist: [stranger('S1')] })

  const result = await drainReviewQueues(portal.fetchWithCookies, drainOptions({ dryRun: true }))

  assert.match(result.stoppedReason, /dry run/)
  assert.deepEqual(result.queuesWithWork, ['specialist'])
  assert.deepEqual(
    portal.calls.map((call) => `${call.method} ${call.path}`),
    ['GET dashboard']
  )
})

test('the review moves a stranger out of the regular queue and claims its own upload behind it', async () => {
  const portal = fakePortal({ regular: [stranger('R1'), photo('R2')] })

  const { claimed, detailUrl } = await claimMatchingSendVideoRequest(
    portal.fetchWithCookies,
    { ...PERSONAS[0] },
    30_000
  )

  assert.equal(claimed.requestIdentifier, 'R2')
  assert.equal(claimed.queue, 'regular')
  assert.equal(detailUrl, `${BASE}/verifyIdentity/R2`)
  assert.deepEqual(portal.queues, { regular: [], specialist: [stranger('R1')] })
  assert.deepEqual(portal.commands(), ['TransferToSpecialist'])
  assert.match(portal.postsTo('transfer')[0].body.get('comment'), /automated e2e queue cleanup/)
  assert.equal(portal.held.request.id, 'R2') // the review goes on holding its claim
})

test('the review stops moving strangers aside once the claim deadline has passed', async () => {
  const portal = fakePortal({ regular: [stranger('R1'), stranger('R2'), photo('R3')] })

  await assert.rejects(
    claimMatchingSendVideoRequest(portal.fetchWithCookies, { ...PERSONAS[0] }, 0),
    /no matching submission within 0ms — last: moved foreign request R1/
  )

  assert.deepEqual(portal.commands(), ['TransferToSpecialist']) // R2 was never claimed
  assert.deepEqual(portal.queues, { regular: [stranger('R2'), photo('R3')], specialist: [stranger('R1')] })
  assert.equal(portal.held, null)
})

test("the review releases the same persona's upload from the other platform instead of moving it", async () => {
  const portal = fakePortal({ regular: [photoOnAndroid('R1')] })

  await assert.rejects(
    claimMatchingSendVideoRequest(portal.fetchWithCookies, { ...PERSONAS[0], platform: 'ios' }, 1),
    /no matching submission within 1ms/
  )

  assert.deepEqual(portal.commands(), ['CloseRequest'])
  assert.deepEqual(portal.postsTo('transfer'), [])
  assert.deepEqual(portal.queues, { regular: [photoOnAndroid('R1')], specialist: [] })
})

test("the review presses only its own queue's claim button", async () => {
  const portal = fakePortal({ specialist: [stranger('S1')] })

  await assert.rejects(
    claimMatchingSendVideoRequest(portal.fetchWithCookies, { ...PERSONAS[0] }, 1),
    /no matching submission within 1ms/
  )

  assert.deepEqual(portal.postsTo('reviewIdentity'), [])
  assert.deepEqual(portal.queues.specialist, [stranger('S1')])
})

test('the cardless review releases a stranger at the specialist head, and gives up when it keeps coming back', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const portal = fakePortal({ specialist: [stranger('S1'), cardless('S2')] })

  const outcome = claimMatchingSendVideoRequest(portal.fetchWithCookies, { ...PERSONAS[1] }, 60_000).then(
    () => 'claimed',
    (error) => error.message
  )
  // Each round lets the chain run to its next claim-poll sleep, then fires that sleep.
  for (let round = 0; round < 6; round++) {
    await new Promise((resolve) => setImmediate(resolve))
    t.mock.timers.tick(5_000)
  }

  assert.match(await outcome, /S1 keeps coming back to the specialist queue/)
  assert.deepEqual(portal.commands(), ['CloseRequest', 'CloseRequest', 'CloseRequest'])
  assert.deepEqual(portal.queues.specialist, [stranger('S1'), cardless('S2')]) // released, back in its place
  assert.equal(portal.held, null)
})
