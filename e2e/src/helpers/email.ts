const TEMP_EMAIL_API = 'https://api.guerrillamail.com/ajax.php'

interface Email {
  mail_id: number
  mail_from: string
}

/**
 * Fetches a temporary email address and its associated token from the Guerrilla Mail API.
 *
 * @returns An object containing the temporary email address and its token, which can be used to check for incoming emails.
 */
export async function getTempEmailAddress(): Promise<{ email: string; token: string }> {
  try {
    const response = await fetch(`${TEMP_EMAIL_API}?f=get_email_address`)

    const { email_addr, sid_token } = await response.json()

    console.log(`Created temporary email address: ${email_addr}`)

    return { email: email_addr, token: sid_token }
  } catch (error) {
    // This runs on the RUNNER's network, and disposable-email services are a standard filtering target,
    // so a TLS error here is that block rather than a broken test — say so, or `fetch failed` alone
    // sends the next person hunting through the app.
    const cause = (error as { cause?: { code?: string } }).cause?.code
    const blocked = cause === 'SELF_SIGNED_CERT_IN_CHAIN' || cause === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    console.error('Error fetching temporary email address:', error)
    throw new Error(
      `Could not reach the temporary-inbox provider (${new URL(TEMP_EMAIL_API).host})${cause ? `: ${cause}` : ''}. ` +
        (blocked
          ? 'The TLS chain was replaced, which is what a network filtering disposable-email services looks like — ' +
            'run this journey from a network that allows it (CI does).'
          : 'The email step cannot run without it.')
    )
  }
}

/** Fetch the inbox listing, or null on a transient failure (the caller retries). */
async function fetchInbox(token: string): Promise<Email[] | null> {
  try {
    const response = await fetch(`${TEMP_EMAIL_API}?f=check_email&seq=1&sid_token=${token}`)
    const inbox = (await response.json()) as { list?: Email[] }
    return inbox.list ?? []
  } catch (error) {
    console.warn('Transient error checking email inbox, retrying...', error)
    return null
  }
}

/** `mail_id` comes back as a string on some responses — compare it as a number, always. */
function mailId(email: Email): number {
  return Number(email.mail_id)
}

/**
 * The highest message id in the inbox, waiting until there is at least one message.
 *
 * Take this BEFORE an action that should send another email, then pass it as `afterMailId` so that
 * wait cannot be satisfied by a message already in flight. Waiting is the point: a 0 baseline from a
 * not-yet-delivered inbox would let the next wait return that first, now-superseded message.
 */
export async function getLatestMailId(
  token: string,
  options: { timeout?: number; interval?: number } = {}
): Promise<number> {
  const { timeout = 60_000, interval = 10_000 } = options
  const deadline = Date.now() + timeout

  for (;;) {
    const list = await fetchInbox(token)
    if (list?.length) {
      return Math.max(...list.map(mailId))
    }
    if (Date.now() > deadline) {
      throw new Error(`No email arrived within ${timeout}ms, so there is no baseline message id to take`)
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

/**
 * Retrieves the confirmation code from the email inbox.
 *
 * Always reads the NEWEST message (highest `mail_id`), not the first in the listing: a resend leaves two
 * codes in the inbox, and it mints a new `email_address_id`, so only the latest one still works.
 *
 * @param token - The token associated with the temporary email address, used to check for incoming emails.
 * @param options - Timeout/polling, plus `afterMailId`: wait for a message newer than that id, ignoring
 *   anything already in the inbox (see {@link getLatestMailId}).
 * @returns The 6-digit confirmation code extracted from the email body.
 */
export async function getEmailConfirmationCode(
  token: string,
  options: { timeout?: number; interval?: number; afterMailId?: number } = {}
): Promise<string> {
  const { timeout = 60_000, interval = 10_000, afterMailId = 0 } = options
  const deadline = Date.now() + timeout

  console.log(`Waiting for email confirmation code${afterMailId ? ` newer than mail ${afterMailId}` : ''}...`)
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval))

    console.log('Checking inbox for confirmation code email...')
    const list = await fetchInbox(token)
    if (!list?.length) {
      continue
    }

    const candidates = list.filter((email) => mailId(email) > afterMailId)
    if (!candidates.length) {
      continue
    }
    const email = candidates.reduce((newest, next) => (mailId(next) > mailId(newest) ? next : newest))
    console.log(`Received email ${mailId(email)} from: ${email.mail_from}`)

    const emailResponse = await fetch(`${TEMP_EMAIL_API}?f=fetch_email&email_id=${email.mail_id}&sid_token=${token}`)
    const emailContent = (await emailResponse.json()) as { mail_body: string }

    // Look for a 6-digit code that is not preceded by a '#' character (to avoid picking up HEX codes)
    const confirmationCodeMatch = emailContent.mail_body.match(/(?<!#)\b(\d{6})\b/)

    if (confirmationCodeMatch) {
      return confirmationCodeMatch[1]
    }

    console.log('Email content:', { emailContent })
    throw new Error('Confirmation code not found in email body')
  }

  throw new Error('Email confirmation code timeout exceeded')
}
