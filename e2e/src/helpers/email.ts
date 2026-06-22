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
    console.error('Error fetching temporary email address:', error)
    throw error
  }
}

/**
 * Retrieves the confirmation code from the email inbox.
 *
 * @param token - The token associated with the temporary email address, used to check for incoming emails.
 * @param options - Optional configuration for timeout and polling interval.
 * @returns The 6-digit confirmation code extracted from the email body.
 */
export async function getEmailConfirmationCode(
  token: string,
  options = { timeout: 60_000, interval: 10_000 }
): Promise<string> {
  const deadline = Date.now() + options.timeout

  console.log(`Waiting for email confirmation code...`)
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, options.interval))

    let inbox: { list: Email[] }
    try {
      console.log('Checking inbox for confirmation code email...')
      const inboxResponse = await fetch(`${TEMP_EMAIL_API}?f=check_email&seq=1&sid_token=${token}`)
      inbox = (await inboxResponse.json()) as { list: Email[] }
    } catch (error) {
      console.warn('Transient error checking email inbox, retrying...', error)
      continue
    }

    if (!inbox.list.length) {
      continue
    }

    const email = inbox.list[0]
    console.log(`Received email from: ${email.mail_from}`)

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
