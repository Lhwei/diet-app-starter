import crypto from 'crypto'

export const NOTION_AUTH_URL = 'https://api.notion.com/v1/oauth/authorize'
export const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token'

export function generateState() {
  return crypto.randomBytes(32).toString('hex')
}

export function buildNotionAuthorizeUrl(state: string) {
  const url = new URL(NOTION_AUTH_URL)
  url.searchParams.set('client_id', process.env.NOTION_CLIENT_ID!)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('owner', 'user')
  url.searchParams.set('redirect_uri', process.env.NOTION_REDIRECT_URI!)
  url.searchParams.set('state', state)
  return url.toString()
}

// 用 code 交換 access_token / refresh_token（伺服器端）
export async function exchangeNotionCode(code: string) {
  const basicAuth = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(NOTION_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.NOTION_REDIRECT_URI,
    }),
  })

  if (!res.ok) {
    throw new Error(`Notion token exchange failed: ${res.status}`)
  }
  return res.json()
}
