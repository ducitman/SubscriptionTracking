import { createHmac } from 'node:crypto'

function sign(payload) {
  const secret = process.env.OAUTH_STATE_SECRET
  if (!secret) throw new Error('OAUTH_STATE_SECRET is missing')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ message: 'Email is required.' })
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !redirectUri || !process.env.GOOGLE_CLIENT_SECRET || !process.env.OAUTH_STATE_SECRET) {
    return res.status(501).json({ message: 'Gmail OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and OAUTH_STATE_SECRET to your environment.' })
  }
  const payload = Buffer.from(JSON.stringify({ email, issuedAt: Date.now() })).toString('base64url')
  const state = `${payload}.${sign(payload)}`
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', access_type: 'offline', prompt: 'consent', scope: 'https://www.googleapis.com/auth/gmail.readonly', state })
  return res.status(200).json({ authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
}
