import { load } from 'cheerio'
import dotenv from 'dotenv'
import makeFetchCookie from 'fetch-cookie'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CookieJar } from 'tough-cookie'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

const initialCookieHeader =
  'Dummy1=DummyVal1; BCGOVFlags=1000%3A1%2C0; BCGOVCustom=NULL; BCGOVBrand=NULL; BCGOVBehavior=NULL; Dummy2=DummyVal2; preDummy1=DummyVal1; preDummy2=DummyVal2; FAILREASON=0; BCGOVTarget=https%3A%2F%2Fidsit.gov.bc.ca%2Fidcheck%2F; BCGOVReferer=https%3A%2F%2Fidsit.gov.bc.ca%2F; SMSESSION=LOGGEDOFF; BCGOVclptryno=1; clp001=Salted__%AD%BAa.%D7L%CA%A2%5C%13%A9%B3%9F%95%F6%EDb%0D%21%8D%F6%1A%A1%B1%E7g%BEMj%C7%AD%DD%CF%B9%ED%3A%0FDB%95_%29%28c%9F%E8%8AI7%A3%2B%F5%03%80%FD3%BC%F4%1C%B5%D9E%C86'

/**
 * Logs a compact summary line for a response and throws on non-2xx status.
 * Returns the response body text so callers that need it can use the return value.
 *
 * @param {string} step
 * @param {Response} response
 * @param {string} [bodyText] - Pre-read body text (if already consumed)
 * @returns {Promise<string>} The response body text
 */
async function logStep(step, response, bodyText) {
  const body = bodyText ?? (await response.text())
  const pathname = new URL(response.url).pathname
  const icon = response.ok ? '+' : '!'
  console.log(`[sm-login] [${icon}] ${step}: ${response.status} ${pathname}`)

  if (!response.ok) {
    const errorDetail = extractErrorMessage(body)
    throw new Error(`[${step}] HTTP ${response.status} ${pathname}\n${errorDetail}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('json')) {
    try {
      const parsed = JSON.parse(body)
      console.log(`  body: ${JSON.stringify(parsed).slice(0, 300)}`)
    } catch {
      console.log(`  body: ${body.slice(0, 300)}`)
    }
  }

  return body
}

/**
 * Extracts a human-readable error message from an HTML error page.
 * Falls back to a raw text snippet if no structured error is found.
 *
 * @param {string} html
 * @returns {string}
 */
function extractErrorMessage(html) {
  try {
    const $ = load(html)
    const title = $('title').first().text().trim()
    const errorText = $('.login-error-message p, #error_div p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join(' | ')

    if (errorText) {
      return title ? `${title}: ${errorText}` : errorText
    }
    if (title) {
      return title
    }
  } catch {
    // cheerio parse failed, fall through
  }

  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.slice(0, 400)
}

/**
 * @param {string} html
 */
function extractPageDataAttributes(html) {
  const $ = load(html)
  const pageDataElement = $('#pageData').first()

  if (pageDataElement.length === 0) {
    return null
  }

  return Object.fromEntries(
    Object.entries(pageDataElement.attr())
      .filter(([attributeName]) => attributeName.startsWith('data-'))
      .map(([attributeName, value]) => [attributeName.slice(5), value])
  )
}

/**
 * SM login flow to approve in-person verification (same behavior as CLI).
 *
 * @param {string} cardSerialNumber
 * @param {string} cardBirthdate
 * @param {string} userCode - 8 digits (no dash)
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function approveInPersonLogin(cardSerialNumber, cardBirthdate, userCode, options = {}) {
  const { signal } = options

  dotenv.config({ path: path.join(SCRIPT_DIR, '..', 'local.env') })

  const cookieJar = new CookieJar()
  const fetchWithCookies = makeFetchCookie(fetch, cookieJar)

  for (const cookie of initialCookieHeader.split(';')) {
    const trimmedCookie = cookie.trim()
    if (!trimmedCookie) {
      continue
    }

    await cookieJar.setCookie(trimmedCookie, 'https://logontest7.gov.bc.ca/')
  }

  const username = process.env.SM_USER
  const password = process.env.SM_PASSWORD

  if (!username || !password) {
    throw new Error('Missing SM_USER or SM_PASSWORD in local.env')
  }

  const body = new URLSearchParams({
    SMENC: 'ISO-8859-1',
    SMLOCALE: 'US-EN',
    target: '/clp-cgi/int01/private/postLogon.cgi',
    smauthreason: '0',
    smagentname: '',
    user: username,
    password,
  }).toString()

  const response = await fetchWithCookies('https://logontest7.gov.bc.ca/clp-cgi/int01/logon.fcc', {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
      'cache-control': 'max-age=0',
      'content-type': 'application/x-www-form-urlencoded',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'upgrade-insecure-requests': '1',
      Referer: 'https://logontest7.gov.bc.ca/clp-cgi/preLogon.cgi',
    },
    body,
    method: 'POST',
    redirect: 'follow',
    signal,
  })
  await logStep('SM login', response)

  const response3 = await fetchWithCookies('https://idsit.gov.bc.ca/idcheck/?', {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-site',
      'upgrade-insecure-requests': '1',
      Referer: 'https://logontest7.gov.bc.ca/',
    },
    body: null,
    method: 'GET',
    signal,
  })
  await logStep('idcheck redirect', response3)

  const response4 = await fetchWithCookies(
    'https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/identify?menuItemAction=verifyMobileCardInPerson',
    {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
        'cache-control': 'max-age=0',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        Referer: 'https://idsit.gov.bc.ca/idcheck/protected/validatecardholder',
      },
      body: null,
      method: 'GET',
      signal,
    }
  )

  const identifyHtml = await logStep('identify in-person', response4)
  const pageDataAttributes = extractPageDataAttributes(identifyHtml)

  if (!pageDataAttributes?.['transaction-id'] || !pageDataAttributes?.['csrf-token']) {
    throw new Error('[identify in-person] Missing transaction-id or csrf-token in page data')
  }
  console.log(`  transaction-id: ${pageDataAttributes['transaction-id']}`)

  const response5 = await fetchWithCookies(
    `https://idsit.gov.bc.ca/cardtap/v3/transactions/${pageDataAttributes['transaction-id']}?clientId=urn:ca:bc:gov:idcheck`,
    {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
        'content-type': 'application/json',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        Referer:
          'https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/identify?menuItemAction=verifyMobileCardInPerson',
      },
      body: null,
      method: 'POST',
      signal,
    }
  )

  await logStep('create transaction', response5)

  const response2 = await fetchWithCookies(
    `https://idsit.gov.bc.ca/cardtap/v3/transactions/${pageDataAttributes['transaction-id']}/cards`,
    {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        Referer:
          'https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/identify?menuItemAction=verifyMobileCardInPerson',
      },
      body: new URLSearchParams({
        card_serial_number: cardSerialNumber,
        birthdate: cardBirthdate,
      }).toString(),
      method: 'POST',
      signal,
    }
  )

  const validateCardTapResult = await logStep('submit card serial/birthdate', response2)

  const response2a = await fetchWithCookies('https://idsit.gov.bc.ca/idcheck/protected/validatecardholder', {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
      'cache-control': 'max-age=0',
      'content-type': 'application/x-www-form-urlencoded',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      Referer:
        'https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/identify?menuItemAction=verifyMobileCardInPerson',
    },
    body: new URLSearchParams({
      csrftoken: pageDataAttributes['csrf-token'],
      validateCardTapResult,
    }).toString(),
    method: 'POST',
    signal,
  })

  await logStep('validate cardholder', response2a)

  const response6 = await fetchWithCookies('https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/usercode', {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
      'cache-control': 'max-age=0',
      'content-type': 'application/x-www-form-urlencoded',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      Referer: 'https://idsit.gov.bc.ca/idcheck/protected/validatecardholder',
    },
    body: new URLSearchParams({
      csrftoken: pageDataAttributes['csrf-token'],
      autoPrint: 'true',
      printtype: 'receipt',
      suspiciousActivityVerificationValue: '0',
      command: 'Continue',
    }).toString(),
    method: 'POST',
    signal,
  })

  await logStep('submit usercode page', response6)

  const response7 = await fetchWithCookies('https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/approve', {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
      'cache-control': 'max-age=0',
      'content-type': 'application/x-www-form-urlencoded',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      Referer: 'https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/usercode',
    },
    body: new URLSearchParams({
      csrftoken: pageDataAttributes['csrf-token'],
      usercode: userCode,
      command: 'continue',
    }).toString(),
    method: 'POST',
    signal,
  })
  await logStep('approve usercode', response7)
}

function isRunAsCli() {
  const entry = process.argv[1]
  if (!entry) {
    return false
  }
  return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(entry)
}

if (isRunAsCli()) {
  const [cardSerialNumber, cardBirthdate, userCode] = process.argv.slice(2)

  if (!cardSerialNumber || !cardBirthdate || !userCode) {
    console.error('Usage: node login.mjs <cardSerialNumber> <cardBirthdate(YYYY-MM-DD)> <userCode>')
    process.exit(1)
  } else {
    await approveInPersonLogin(cardSerialNumber, cardBirthdate, userCode)
  }
}
